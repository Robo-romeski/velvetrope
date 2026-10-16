import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  PHOTO_CONTENT_TYPES,
  PHOTO_MAX_BYTES,
  PhotoStorageService,
} from '../checkin/photo-storage.service';
import { MembersService } from './members.service';

const AVATAR_OBJECT_PREFIX = 'avatars';

type UploadedAvatarFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

@Injectable()
export class MemberAvatarService {
  private readonly dataDir: string;

  constructor(
    private readonly storage: PhotoStorageService,
    private readonly members: MembersService,
  ) {
    this.dataDir =
      process.env.AVATAR_DATA_DIR?.trim() || join(process.cwd(), 'data', 'avatars');
  }

  private objectKey(userId: string): string {
    return `${AVATAR_OBJECT_PREFIX}/${userId}/avatar`;
  }

  publicAvatarUrl(userId: string): string {
    const base =
      process.env.PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
      `http://localhost:${process.env.PORT ?? 3010}`;
    return `${base}/media/avatars/${encodeURIComponent(userId)}`;
  }

  private useDirectUpload(): boolean {
    return (
      process.env.NODE_ENV === 'test' || !this.storage.isConfigured()
    );
  }

  async createUploadRequest(
    userId: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<
    | {
        mode: 'direct';
        maxBytes: number;
        acceptedContentTypes: readonly string[];
      }
    | {
        mode: 's3';
        uploadUrl: string;
        headers: Record<string, string>;
        contentType: string;
        sizeBytes: number;
      }
  > {
    this.storage.validateUpload(contentType, sizeBytes);
    if (this.useDirectUpload()) {
      return {
        mode: 'direct',
        maxBytes: PHOTO_MAX_BYTES,
        acceptedContentTypes: PHOTO_CONTENT_TYPES,
      };
    }
    const objectKey = this.objectKey(userId);
    const signed = await this.storage.createUploadUrl({ objectKey, contentType });
    return {
      mode: 's3',
      uploadUrl: signed.url,
      headers: signed.headers,
      contentType,
      sizeBytes,
    };
  }

  async completeS3Upload(
    userId: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<{ avatarUrl: string }> {
    if (this.useDirectUpload()) {
      throw new BadRequestException('Use direct avatar upload');
    }
    const objectKey = this.objectKey(userId);
    await this.storage.verifyUploaded({ objectKey, contentType, sizeBytes });
    const avatarUrl = this.publicAvatarUrl(userId);
    await this.members.updateOwnProfile(userId, { avatarUrl });
    return { avatarUrl };
  }

  async saveDirectUpload(
    userId: string,
    file: UploadedAvatarFile | undefined,
  ): Promise<{ avatarUrl: string }> {
    if (!this.useDirectUpload()) {
      throw new ServiceUnavailableException(
        'Direct upload is disabled when S3 is configured',
      );
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Avatar file required');
    }
    this.storage.validateUpload(file.mimetype, file.size);
    this.ensureDataDir();
    const filePath = this.localFilePath(userId);
    writeFileSync(filePath, file.buffer);
    this.writeLocalMeta(userId, file.mimetype);
    const avatarUrl = this.publicAvatarUrl(userId);
    await this.members.updateOwnProfile(userId, { avatarUrl });
    return { avatarUrl };
  }

  async streamAvatar(
    userId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; contentType: string }> {
    const localPath = this.localFilePath(userId);
    if (existsSync(localPath)) {
      return {
        stream: createReadStream(localPath),
        contentType: this.readLocalMeta(userId) ?? 'image/jpeg',
      };
    }
    if (this.storage.isConfigured() && process.env.NODE_ENV !== 'test') {
      const fromS3 = await this.storage.getObjectStream(this.objectKey(userId));
      if (fromS3) return fromS3;
    }
    throw new NotFoundException('Avatar not found');
  }

  private ensureDataDir(): void {
    mkdirSync(this.dataDir, { recursive: true });
  }

  private localFilePath(userId: string): string {
    return join(this.dataDir, userId);
  }

  private metaPath(userId: string): string {
    return join(this.dataDir, `${userId}.meta.json`);
  }

  private writeLocalMeta(userId: string, contentType: string): void {
    this.ensureDataDir();
    writeFileSync(
      this.metaPath(userId),
      JSON.stringify({ contentType }),
      'utf8',
    );
  }

  private readLocalMeta(userId: string): string | null {
    const path = this.metaPath(userId);
    if (!existsSync(path)) return null;
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
        contentType?: string;
      };
      return parsed.contentType ?? null;
    } catch {
      return null;
    }
  }
}
