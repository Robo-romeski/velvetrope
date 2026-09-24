import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ReportSubjectType = 'event' | 'user';
export type ReportCategory =
  | 'harassment'
  | 'safety'
  | 'spam'
  | 'other';
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

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
