import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

@Entity({ name: 'chat_messages' })
@Index(['eventId', 'createdAt'])
export class ChatMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  eventId!: string;

  @Column({ type: 'text' })
  authorSub!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: dateTimeColumnType(), nullable: true })
  deletedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  deletedByHostId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
