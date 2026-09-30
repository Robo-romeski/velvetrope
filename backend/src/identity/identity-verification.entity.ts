import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

export type IdentityVerificationStatus =
  | 'not_started'
  | 'pending'
  | 'needs_review'
  | 'approved'
  | 'failed'
  | 'expired';

@Entity({ name: 'identity_verifications' })
export class IdentityVerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  userSub!: string;

  @Column({ type: 'text', default: 'persona' })
  provider!: 'persona';

  @Index({ unique: true })
  @Column({ type: 'text', nullable: true })
  inquiryId?: string | null;

  @Column({ type: 'text', default: 'not_started' })
  status!: IdentityVerificationStatus;

  @Column({ type: dateTimeColumnType(), nullable: true })
  verifiedAt?: Date | null;

  @Column({ type: dateTimeColumnType(), nullable: true })
  lastWebhookAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  lastWebhookEventId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
