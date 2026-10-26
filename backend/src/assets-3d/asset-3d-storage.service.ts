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
import { randomUUID } from 'crypto';
import { extname } from 'path';

export const MODEL_MAX_BYTES = 100 * 1024 * 1024;
export const THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;
const GLTF_JSON_MAX_BYTES = 25 * 1024 * 1024;
const THUMBNAIL_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

type UploadKind = 'model' | 'thumbnail';

@Injectable()
export class Asset3dStorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string | null;

  constructor() {
    this.bucket =
      process.env.S3_ASSET_BUCKET?.trim() ||
      process.env.S3_PHOTO_BUCKET?.trim() ||
      null;
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

  validateUpload(input: {
    kind: UploadKind;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }): '.glb' | '.gltf' | '.jpg' | '.jpeg' | '.png' | '.webp' {
    const extension = extname(input.filename.trim()).toLowerCase();
    if (
      !Number.isInteger(input.sizeBytes) ||
      input.sizeBytes <= 0 ||
      input.sizeBytes >
        (input.kind === 'model' ? MODEL_MAX_BYTES : THUMBNAIL_MAX_BYTES)
    ) {
      throw new BadRequestException(
        input.kind === 'model'
          ? '3D models must be 100 MB or smaller'
          : 'Thumbnails must be 5 MB or smaller',
      );
    }

    if (input.kind === 'thumbnail') {
      if (
        !THUMBNAIL_CONTENT_TYPES.includes(
          input.contentType as (typeof THUMBNAIL_CONTENT_TYPES)[number],
        ) ||
        !['.jpg', '.jpeg', '.png', '.webp'].includes(extension)
      ) {
        throw new BadRequestException('Thumbnail must be JPEG, PNG, or WebP');
      }
      return extension as '.jpg' | '.jpeg' | '.png' | '.webp';
    }

    if (extension === '.glb') {
      if (
        !['model/gltf-binary', 'application/octet-stream'].includes(
          input.contentType,
        )
      ) {
        throw new BadRequestException(
          'GLB files must use model/gltf-binary or application/octet-stream',
        );
      }
      return extension;
    }
    if (extension === '.gltf') {
      if (
        !['model/gltf+json', 'application/json'].includes(input.contentType)
      ) {
        throw new BadRequestException(
          'glTF files must use model/gltf+json or application/json',
        );
      }
      if (input.sizeBytes > GLTF_JSON_MAX_BYTES) {
        throw new BadRequestException('glTF JSON must be 25 MB or smaller');
      }
      return extension;
    }
    throw new BadRequestException('Model must be a .glb or .gltf file');
  }

  createObjectKey(
    assetId: string,
    kind: UploadKind,
    extension: string,
  ): string {
    return `assets-3d/${assetId}/${kind}-${randomUUID()}${extension}`;
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

  async verifyUpload(input: {
    kind: UploadKind;
    objectKey: string;
    contentType: string;
    sizeBytes: number;
    filename: string;
  }): Promise<void> {
    const extension = this.validateUpload(input);
    this.assertAssetObjectKey(input.objectKey);
    this.assertConfigured();
    if (process.env.NODE_ENV === 'test') return;

    const head = await this.client!.send(
      new HeadObjectCommand({
        Bucket: this.bucket!,
        Key: input.objectKey,
      }),
    );
    const actualSize = Number(head.ContentLength ?? 0);
    const actualType = head.ContentType ?? '';
    if (
      actualSize !== input.sizeBytes ||
      actualSize <= 0 ||
      actualType !== input.contentType
    ) {
      await this.deleteObject(input.objectKey);
      throw new BadRequestException(
        'Uploaded file metadata did not match the signed request',
      );
    }

    if (input.kind === 'thumbnail') return;
    try {
      if (extension === '.glb') {
        await this.verifyGlb(input.objectKey, input.sizeBytes);
      } else {
        await this.verifyGltf(input.objectKey);
      }
    } catch (error) {
      await this.deleteObject(input.objectKey);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'The uploaded 3D model is corrupted or unsupported',
      );
    }
  }

  async createReadUrl(objectKey: string): Promise<string> {
    this.assertAssetObjectKey(objectKey);
    this.assertConfigured();
    if (process.env.NODE_ENV === 'test') {
      return `https://storage.test.invalid/${encodeURIComponent(objectKey)}`;
    }
    return await getSignedUrl(
      this.client!,
      new GetObjectCommand({ Bucket: this.bucket!, Key: objectKey }),
      { expiresIn: 15 * 60 },
    );
  }

  async deleteObject(objectKey: string | null): Promise<void> {
    if (!objectKey || process.env.NODE_ENV === 'test') return;
    this.assertAssetObjectKey(objectKey);
    if (!this.client || !this.bucket) return;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }

  private async verifyGlb(objectKey: string, expectedSize: number) {
    const bytes = await this.readObject(objectKey, 'bytes=0-11');
    if (bytes.byteLength !== 12) {
      throw new BadRequestException('GLB header is incomplete');
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const magic = view.getUint32(0, true);
    const version = view.getUint32(4, true);
    const declaredLength = view.getUint32(8, true);
    if (
      magic !== 0x46546c67 ||
      version !== 2 ||
      declaredLength !== expectedSize
    ) {
      throw new BadRequestException('GLB header is invalid');
    }
  }

  private async verifyGltf(objectKey: string) {
    const bytes = await this.readObject(objectKey);
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new BadRequestException('glTF file is not valid JSON');
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new BadRequestException('glTF document is invalid');
    }
    const document = parsed as {
      asset?: { version?: unknown };
      buffers?: Array<{ uri?: unknown }>;
      images?: Array<{ uri?: unknown }>;
    };
    if (document.asset?.version !== '2.0') {
      throw new BadRequestException('Only glTF 2.0 assets are supported');
    }
    const externalUris = [
      ...(document.buffers ?? []),
      ...(document.images ?? []),
    ]
      .map((entry) => entry.uri)
      .filter(
        (uri): uri is string =>
          typeof uri === 'string' && !uri.startsWith('data:'),
      );
    if (externalUris.length > 0) {
      throw new BadRequestException(
        'Standalone .gltf uploads must embed buffers and images as data URIs; use GLB for multi-file models',
      );
    }
  }

  private async readObject(
    objectKey: string,
    range?: string,
  ): Promise<Uint8Array> {
    const result = await this.client!.send(
      new GetObjectCommand({
        Bucket: this.bucket!,
        Key: objectKey,
        Range: range,
      }),
    );
    if (!result.Body) throw new BadRequestException('Uploaded file is empty');
    return await result.Body.transformToByteArray();
  }

  private assertAssetObjectKey(objectKey: string) {
    if (!objectKey.startsWith('assets-3d/')) {
      throw new BadRequestException('Invalid 3D asset object key');
    }
  }

  private assertConfigured() {
    if (process.env.NODE_ENV !== 'test' && (!this.client || !this.bucket)) {
      throw new ServiceUnavailableException(
        '3D asset storage is not configured',
      );
    }
  }
}
