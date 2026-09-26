import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

export type ApplicationStatus =
  | 'pending'
  | 'waitlisted'
  | 'approved'
  | 'rejected';

@Entity({ name: 'applications' })
@Index(['eventId', 'applicantSub'], { unique: true })
export class ApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  eventId!: string;

  @Column({ type: 'text' })
  applicantSub!: string;

  @Column({ type: 'text', nullable: true })
  answers?: string | null; // JSON string

  @Column({ type: 'text', default: 'pending' })
  status!: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  decisionReason?: string | null;

  @Column({ type: dateTimeColumnType(), nullable: true })
  decidedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  decidedByHostId?: string | null;

  @Column({ type: dateTimeColumnType(), nullable: true })
  waitlistedAt?: Date | null;

  @Column({ type: 'integer', nullable: true })
  waitlistRank?: number | null;

  @Column({ type: dateTimeColumnType(), nullable: true })
  promotedAt?: Date | null;

  @Column({ type: dateTimeColumnType(), nullable: true })
  codeOfConductAcceptedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
