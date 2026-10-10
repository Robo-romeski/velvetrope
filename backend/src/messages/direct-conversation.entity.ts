import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

@Entity({ name: 'direct_conversations' })
@Index(
  'UQ_direct_conversations_participants',
  ['participantAId', 'participantBId'],
  {
    unique: true,
  },
)
@Index('IDX_direct_conversations_a_last', ['participantAId', 'lastMessageAt'])
@Index('IDX_direct_conversations_b_last', ['participantBId', 'lastMessageAt'])
export class DirectConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  participantAId!: string;

  @Column({ type: 'text' })
  participantBId!: string;

  @Column({ type: dateTimeColumnType(), nullable: true })
  participantAReadAt!: Date | null;

  @Column({ type: dateTimeColumnType(), nullable: true })
  participantBReadAt!: Date | null;

  @Column({ type: dateTimeColumnType(), nullable: true })
  lastMessageAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
