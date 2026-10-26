import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset3dEntity, Asset3dStatus } from './asset-3d.entity';
import { Asset3dStorageService } from './asset-3d-storage.service';

type AssetMetadataInput = {
  title?: string;
  slug?: string;
  description?: string | null;
  category?: string;
  tags?: string[];
};

type UploadInput = {
  kind?: 'model' | 'thumbnail';
  filename?: string;
  contentType?: string;
  sizeBytes?: number;
};

@Injectable()
export class Assets3dService {
  constructor(
    @InjectRepository(Asset3dEntity)
    private readonly assets: Repository<Asset3dEntity>,
    private readonly storage: Asset3dStorageService,
  ) {}

  async listPublished(input: {
    query?: string;
    category?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = this.clampInt(input.page, 1, 10_000, 1);
    const pageSize = this.clampInt(input.pageSize, 1, 100, 24);
    const query = input.query?.trim().toLocaleLowerCase() ?? '';
    const category = input.category?.trim().toLocaleLowerCase() ?? '';
    const tag = input.tag?.trim().toLocaleLowerCase() ?? '';
    const rows = await this.assets.find({
      where: { status: 'published' },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
    });
    const filtered = rows.filter((asset) => {
      const searchable = [
        asset.title,
        asset.description ?? '',
        asset.category,
        ...asset.tags,
      ]
        .join(' ')
        .toLocaleLowerCase();
      return (
        (!query || searchable.includes(query)) &&
        (!category || asset.category.toLocaleLowerCase() === category) &&
        (!tag || asset.tags.some((value) => value.toLocaleLowerCase() === tag))
      );
    });
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);
    return {
      items: await Promise.all(items.map((asset) => this.toCatalogItem(asset))),
      total: filtered.length,
      page,
      pageSize,
      categories: [...new Set(rows.map((asset) => asset.category))].sort(),
    };
  }

  async getPublished(slug: string) {
    const asset = await this.assets.findOne({
      where: { slug, status: 'published' },
    });
    if (!asset) throw new NotFoundException('3D asset not found');
    return await this.toDetail(asset);
  }

  async listAdmin(input: { query?: string; status?: Asset3dStatus | 'all' }) {
    const rows = await this.assets.find({
      order: { updatedAt: 'DESC' },
    });
    const query = input.query?.trim().toLocaleLowerCase() ?? '';
    const status = input.status ?? 'all';
    return {
      items: rows
        .filter(
          (asset) =>
            (status === 'all' || asset.status === status) &&
            (!query ||
              `${asset.title} ${asset.slug} ${asset.category} ${asset.tags.join(' ')}`
                .toLocaleLowerCase()
                .includes(query)),
        )
        .map((asset) => this.toAdminSummary(asset)),
      total: rows.length,
    };
  }

  async create(adminId: string, input: AssetMetadataInput) {
    const title = this.requiredText(input.title, 'Title', 120);
    const category = this.requiredText(input.category, 'Category', 80);
    const slug = await this.availableSlug(input.slug || title);
    const asset = await this.assets.save(
      this.assets.create({
        title,
        slug,
        description: this.optionalText(input.description, 4_000),
        category,
        tags: this.normalizeTags(input.tags),
        status: 'draft',
        modelObjectKey: null,
        modelContentType: null,
        modelSizeBytes: null,
        modelFilename: null,
        thumbnailObjectKey: null,
        thumbnailContentType: null,
        thumbnailSizeBytes: null,
        thumbnailFilename: null,
        createdBy: adminId,
        publishedAt: null,
      }),
    );
    return this.toAdminDetail(asset);
  }

  async update(id: string, input: AssetMetadataInput) {
    const asset = await this.requireAsset(id);
    if (input.title !== undefined) {
      asset.title = this.requiredText(input.title, 'Title', 120);
    }
    if (input.category !== undefined) {
      asset.category = this.requiredText(input.category, 'Category', 80);
    }
    if (input.description !== undefined) {
      asset.description = this.optionalText(input.description, 4_000);
    }
    if (input.tags !== undefined) {
      asset.tags = this.normalizeTags(input.tags);
    }
    if (input.slug !== undefined) {
      const slug = this.slugify(input.slug);
      const existing = await this.assets.findOne({ where: { slug } });
      if (existing && existing.id !== asset.id) {
        throw new ConflictException('That asset slug is already in use');
      }
      asset.slug = slug;
    }
    return this.toAdminDetail(await this.assets.save(asset));
  }

  async getAdmin(id: string) {
    return await this.toAdminDetail(await this.requireAsset(id));
  }

  async requestUpload(id: string, input: UploadInput) {
    await this.requireAsset(id);
    const kind = input.kind;
    if (kind !== 'model' && kind !== 'thumbnail') {
      throw new BadRequestException('Upload kind must be model or thumbnail');
    }
    const filename = this.requiredText(input.filename, 'Filename', 255);
    const contentType = this.requiredText(
      input.contentType,
      'Content type',
      120,
    ).toLocaleLowerCase();
    const sizeBytes = Number(input.sizeBytes);
    const extension = this.storage.validateUpload({
      kind,
      filename,
      contentType,
      sizeBytes,
    });
    const objectKey = this.storage.createObjectKey(id, kind, extension);
    const upload = await this.storage.createUploadUrl({
      objectKey,
      contentType,
    });
    return { ...upload, objectKey, kind, expiresInSeconds: 600 };
  }

  async completeUpload(
    id: string,
    input: UploadInput & { objectKey?: string },
  ) {
    const asset = await this.requireAsset(id);
    const kind = input.kind;
    if (kind !== 'model' && kind !== 'thumbnail') {
      throw new BadRequestException('Upload kind must be model or thumbnail');
    }
    const objectKey = this.requiredText(input.objectKey, 'Object key', 500);
    if (!objectKey.startsWith(`assets-3d/${id}/${kind}-`)) {
      throw new BadRequestException('Upload does not belong to this asset');
    }
    const filename = this.requiredText(input.filename, 'Filename', 255);
    const contentType = this.requiredText(
      input.contentType,
      'Content type',
      120,
    ).toLocaleLowerCase();
    const sizeBytes = Number(input.sizeBytes);
    await this.storage.verifyUpload({
      kind,
      objectKey,
      contentType,
      sizeBytes,
      filename,
    });

    const previous =
      kind === 'model' ? asset.modelObjectKey : asset.thumbnailObjectKey;
    if (kind === 'model') {
      asset.modelObjectKey = objectKey;
      asset.modelContentType = contentType;
      asset.modelSizeBytes = sizeBytes;
      asset.modelFilename = filename;
    } else {
      asset.thumbnailObjectKey = objectKey;
      asset.thumbnailContentType = contentType;
      asset.thumbnailSizeBytes = sizeBytes;
      asset.thumbnailFilename = filename;
    }
    const saved = await this.assets.save(asset);
    if (previous && previous !== objectKey) {
      await this.storage.deleteObject(previous);
    }
    return await this.toAdminDetail(saved);
  }

  async publish(id: string) {
    const asset = await this.requireAsset(id);
    if (!asset.modelObjectKey) {
      throw new BadRequestException(
        'Upload and validate a 3D model before publishing',
      );
    }
    asset.status = 'published';
    asset.publishedAt = asset.publishedAt ?? new Date();
    return await this.toAdminDetail(await this.assets.save(asset));
  }

  async unpublish(id: string) {
    const asset = await this.requireAsset(id);
    asset.status = 'draft';
    asset.publishedAt = null;
    return await this.toAdminDetail(await this.assets.save(asset));
  }

  private async toCatalogItem(asset: Asset3dEntity) {
    return {
      id: asset.id,
      slug: asset.slug,
      title: asset.title,
      description: asset.description,
      category: asset.category,
      tags: asset.tags,
      thumbnailUrl: asset.thumbnailObjectKey
        ? await this.storage.createReadUrl(asset.thumbnailObjectKey)
        : null,
      publishedAt: asset.publishedAt?.toISOString() ?? null,
    };
  }

  private async toDetail(asset: Asset3dEntity) {
    if (!asset.modelObjectKey) {
      throw new NotFoundException('3D asset model not found');
    }
    return {
      ...(await this.toCatalogItem(asset)),
      modelUrl: await this.storage.createReadUrl(asset.modelObjectKey),
      modelContentType: asset.modelContentType,
      modelSizeBytes: asset.modelSizeBytes,
      modelFilename: asset.modelFilename,
    };
  }

  private toAdminSummary(asset: Asset3dEntity) {
    return {
      id: asset.id,
      slug: asset.slug,
      title: asset.title,
      category: asset.category,
      tags: asset.tags,
      status: asset.status,
      hasModel: Boolean(asset.modelObjectKey),
      hasThumbnail: Boolean(asset.thumbnailObjectKey),
      publishedAt: asset.publishedAt?.toISOString() ?? null,
      updatedAt: asset.updatedAt.toISOString(),
    };
  }

  private async toAdminDetail(asset: Asset3dEntity) {
    return {
      ...this.toAdminSummary(asset),
      description: asset.description,
      modelUrl: asset.modelObjectKey
        ? await this.storage.createReadUrl(asset.modelObjectKey)
        : null,
      modelContentType: asset.modelContentType,
      modelSizeBytes: asset.modelSizeBytes,
      modelFilename: asset.modelFilename,
      thumbnailUrl: asset.thumbnailObjectKey
        ? await this.storage.createReadUrl(asset.thumbnailObjectKey)
        : null,
      thumbnailContentType: asset.thumbnailContentType,
      thumbnailSizeBytes: asset.thumbnailSizeBytes,
      thumbnailFilename: asset.thumbnailFilename,
      createdBy: asset.createdBy,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  private async requireAsset(id: string) {
    const asset = await this.assets.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('3D asset not found');
    return asset;
  }

  private async availableSlug(value: string) {
    const base = this.slugify(value);
    let slug = base;
    let suffix = 2;
    while (await this.assets.exist({ where: { slug } })) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }

  private slugify(value: string) {
    const slug = value
      .trim()
      .toLocaleLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
    if (!slug) throw new BadRequestException('Slug is invalid');
    return slug;
  }

  private requiredText(value: unknown, label: string, max: number) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${label} is required`);
    }
    if (value.trim().length > max) {
      throw new BadRequestException(
        `${label} must be ${max} characters or fewer`,
      );
    }
    return value.trim();
  }

  private optionalText(value: unknown, max: number): string | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string' || value.trim().length > max) {
      throw new BadRequestException(
        `Description must be ${max} characters or fewer`,
      );
    }
    return value.trim() || null;
  }

  private normalizeTags(tags: unknown): string[] {
    if (tags === undefined) return [];
    if (!Array.isArray(tags)) {
      throw new BadRequestException('Tags must be an array');
    }
    const normalized: string[] = [];
    for (const value of tags) {
      if (typeof value !== 'string') continue;
      const tag = value.trim().slice(0, 48);
      if (tag && !normalized.includes(tag)) normalized.push(tag);
      if (normalized.length >= 20) break;
    }
    return normalized;
  }

  private clampInt(
    value: number | undefined,
    min: number,
    max: number,
    fallback: number,
  ) {
    const number = Number(value);
    if (!Number.isInteger(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }
}
