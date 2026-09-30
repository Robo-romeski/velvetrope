import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'admin_audit_log' })
export class AdminAuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  actorSub!: string;

  @Column({ type: 'text' })
  action!: string;

  @Column({ type: 'text' })
  targetType!: string;

  @Column({ type: 'text' })
  targetId!: string;

  @Column({ type: 'text', nullable: true })
  metadata?: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
