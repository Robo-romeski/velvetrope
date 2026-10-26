import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

export type Asset3dStatus = 'draft' | 'published';

@Entity({ name: 'assets_3d' })
@Index('IDX_assets_3d_slug', ['slug'], { unique: true })
@Index('IDX_assets_3d_status_published', ['status', 'publishedAt'])
export class Asset3dEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  slug!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  category!: string;

  @Column({ type: 'simple-json' })
  tags!: string[];

  @Column({ type: 'text', default: 'draft' })
  status!: Asset3dStatus;

  @Column({ type: 'text', nullable: true })
  modelObjectKey!: string | null;

  @Column({ type: 'text', nullable: true })
  modelContentType!: string | null;

  @Column({ type: 'integer', nullable: true })
  modelSizeBytes!: number | null;

  @Column({ type: 'text', nullable: true })
  modelFilename!: string | null;

  @Column({ type: 'text', nullable: true })
  thumbnailObjectKey!: string | null;

  @Column({ type: 'text', nullable: true })
  thumbnailContentType!: string | null;

  @Column({ type: 'integer', nullable: true })
  thumbnailSizeBytes!: number | null;

  @Column({ type: 'text', nullable: true })
  thumbnailFilename!: string | null;

  @Column({ type: 'text' })
  createdBy!: string;

  @Column({ type: dateTimeColumnType(), nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
