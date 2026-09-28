import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

@Injectable()
export class PhotoStorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string | null;

  constructor() {
    this.bucket = process.env.S3_PHOTO_BUCKET?.trim() || null;
    if (!this.bucket || process.env.NODE_ENV === 'test') {
      this.client = null;
      return;
    }

    const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
    this.client = new S3Client({
      region: process.env.S3_REGION?.trim() || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  isConfigured(): boolean {
    return process.env.NODE_ENV === 'test' || !!(this.client && this.bucket);
  }

  validateUpload(contentType: string, sizeBytes: number): void {
    if (
      !PHOTO_CONTENT_TYPES.includes(
        contentType as (typeof PHOTO_CONTENT_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Photo must be JPEG, PNG, or WebP');
    }
    if (
      !Number.isInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > PHOTO_MAX_BYTES
    ) {
      throw new BadRequestException('Photo must be 5 MB or smaller');
    }
  }

  async createUploadUrl(input: {
    objectKey: string;
    contentType: string;
  }): Promise<{ url: string; headers: Record<string, string> }> {
    this.assertConfigured();
    if (process.env.NODE_ENV === 'test') {
      return {
        url: `https://storage.test.invalid/${encodeURIComponent(input.objectKey)}`,
        headers: { 'Content-Type': input.contentType },
      };
    }
    const url = await getSignedUrl(
      this.client!,
      new PutObjectCommand({
        Bucket: this.bucket!,
        Key: input.objectKey,
        ContentType: input.contentType,
      }),
      { expiresIn: 10 * 60 },
    );
    return { url, headers: { 'Content-Type': input.contentType } };
  }

  async verifyUploaded(input: {
    objectKey: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<void> {
    this.assertConfigured();
    if (process.env.NODE_ENV === 'test') return;
    const result = await this.client!.send(
      new HeadObjectCommand({
        Bucket: this.bucket!,
        Key: input.objectKey,
      }),
    );
    const actualSize = Number(result.ContentLength ?? 0);
    const actualType = result.ContentType ?? '';
    if (
      actualSize <= 0 ||
      actualSize > PHOTO_MAX_BYTES ||
      actualSize !== input.sizeBytes ||
      actualType !== input.contentType
    ) {
      await this.deleteObject(input.objectKey);
      throw new BadRequestException(
        'Uploaded photo metadata did not match the signed request',
      );
    }
  }

  async createReadUrl(objectKey: string): Promise<string> {
    this.assertConfigured();
    if (process.env.NODE_ENV === 'test') {
      return `https://storage.test.invalid/${encodeURIComponent(objectKey)}`;
    }
    return await getSignedUrl(
      this.client!,
      new GetObjectCommand({
        Bucket: this.bucket!,
        Key: objectKey,
      }),
      { expiresIn: 5 * 60 },
    );
  }

  async deleteObject(objectKey: string): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    if (!this.client || !this.bucket) return;
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Photo storage is not configured');
    }
  }
}
