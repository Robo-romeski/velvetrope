import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'direct_messages' })
@Index('IDX_direct_messages_conversation_created', [
  'conversationId',
  'createdAt',
])
export class DirectMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  conversationId!: string;

  @Column({ type: 'text' })
  senderId!: string;

  @Column({ type: 'text' })
  body!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
