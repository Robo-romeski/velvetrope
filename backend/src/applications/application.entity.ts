import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

@Entity({ name: 'applications' })
export class ApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  eventId!: string;

  @Column({ type: 'text' })
  applicantSub!: string; // auth0 sub or user identifier

  @Column({ type: 'text', nullable: true })
  answers?: string | null; // JSON string

  @Column({ type: 'text', default: 'pending' })
  status!: ApplicationStatus;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}


