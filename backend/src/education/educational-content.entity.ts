import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

export type ContentType = 'guide' | 'tutorial' | 'course' | 'workshop_link';
export type ContentStatus = 'draft' | 'published';

@Entity({ name: 'educational_contents' })
export class EducationalContentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  creatorId!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  slug!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ type: 'text' })
  contentType!: ContentType;

  @Column({ type: 'text', default: 'draft' })
  status!: ContentStatus;

  @Column({ type: 'simple-json' })
  tags!: string[];

  @Column({ type: 'text', nullable: true })
  groupId?: string | null;

  @Column({ type: 'text', nullable: true })
  externalUrl?: string | null;

  @Column({ type: 'integer', default: 0 })
  priceCents!: number;

  @Column({ type: dateTimeColumnType(), nullable: true })
  publishedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
