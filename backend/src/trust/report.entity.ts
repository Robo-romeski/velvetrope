import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

export type ReportSubjectType = 'event' | 'user' | 'message' | 'content';
export type ReportCategory = 'harassment' | 'safety' | 'spam' | 'other';
export type ReportStatus = 'open' | 'resolved';

@Entity({ name: 'trust_reports' })
export class TrustReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  reporterSub!: string;

  @Column({ type: 'text' })
  subjectType!: ReportSubjectType;

  @Column({ type: 'text' })
  subjectId!: string;

  @Column({ type: 'text' })
  category!: ReportCategory;

  @Column({ type: 'text' })
  details!: string;

  @Column({ type: 'text', default: 'open' })
  status!: ReportStatus;

  @Column({ type: 'text', nullable: true })
  assignedToAdminId?: string | null;

  @Column({ type: 'text', nullable: true })
  adminNotes?: string | null;

  @Column({ type: dateTimeColumnType(), nullable: true })
  resolvedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
