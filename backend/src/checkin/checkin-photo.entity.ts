import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

@Entity({ name: 'checkin_photos' })
@Index(['eventId', 'userSub'], { unique: true })
export class CheckinPhotoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  eventId!: string;

  @Column({ type: 'text' })
  userSub!: string;

  @Column({ type: 'text' })
  objectKey!: string;

  @Column({ type: 'text' })
  contentType!: string;

  @Column({ type: 'integer' })
  sizeBytes!: number;

  @Column({ type: dateTimeColumnType(), nullable: true })
  uploadedAt?: Date | null;

  @Column({ type: dateTimeColumnType(), nullable: true })
  verifiedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  verifiedByHostId?: string | null;

  @Column({ type: dateTimeColumnType() })
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
