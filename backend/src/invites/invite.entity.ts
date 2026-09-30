import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

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

  @Column({ type: dateTimeColumnType(), nullable: true })
  usedAt?: Date | null;

  @Column({ type: dateTimeColumnType(), nullable: true })
  expiresAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
