import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'invites' })
export class InviteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  code!: string;

  @Column({ type: 'text' })
  eventId!: string;

  @Column({ type: 'text', nullable: true })
  usedBy?: string | null;

  @Column({ type: 'datetime', nullable: true })
  usedAt?: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
