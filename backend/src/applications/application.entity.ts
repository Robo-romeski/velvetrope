import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

@Entity({ name: 'applications' })
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

  @Column({ type: 'datetime', nullable: true })
  codeOfConductAcceptedAt?: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
