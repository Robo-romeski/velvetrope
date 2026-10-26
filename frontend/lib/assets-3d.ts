export type Asset3dStatus = 'draft' | 'published';

export type Asset3dCatalogItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  thumbnailUrl: string | null;
  publishedAt: string | null;
};

export type Asset3dDetail = Asset3dCatalogItem & {
  modelUrl: string;
  modelContentType: string;
  modelSizeBytes: number;
  modelFilename: string;
};

export type AdminAsset3dSummary = {
  id: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  status: Asset3dStatus;
  hasModel: boolean;
  hasThumbnail: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminAsset3d = AdminAsset3dSummary & {
  description: string | null;
  modelUrl: string | null;
  modelContentType: string | null;
  modelSizeBytes: number | null;
  modelFilename: string | null;
  thumbnailUrl: string | null;
  thumbnailContentType: string | null;
  thumbnailSizeBytes: number | null;
  thumbnailFilename: string | null;
  createdBy: string;
  createdAt: string;
};

export type Asset3dCatalogPage = {
  items: Asset3dCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  categories: string[];
};
