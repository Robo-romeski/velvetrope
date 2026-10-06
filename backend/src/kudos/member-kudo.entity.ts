import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';
import type { KudoContextType, KudoStatus, KudoType } from './kudo.types';

@Entity({ name: 'member_kudos' })
@Index('IDX_member_kudos_recipient_status', ['recipientId', 'status'])
@Index('IDX_member_kudos_giver_created', ['giverId', 'createdAt'])
export class MemberKudoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  giverId!: string;

  @Column({ type: 'text' })
  recipientId!: string;

  @Column({ type: 'text' })
  kudoType!: KudoType;

  @Column({ type: 'text', default: 'pending' })
  status!: KudoStatus;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'text', nullable: true })
  contextType!: KudoContextType | null;

  @Column({ type: 'text', nullable: true })
  contextId!: string | null;

  @Column({ type: 'boolean', default: false })
  contextVerified!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: dateTimeColumnType(), nullable: true })
  approvedAt!: Date | null;
}
