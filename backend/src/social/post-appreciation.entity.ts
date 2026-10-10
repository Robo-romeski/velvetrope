import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'post_appreciations' })
@Index(['postId', 'userId'], { unique: true })
@Index('IDX_post_appreciations_user_created', ['userId', 'createdAt'])
export class PostAppreciationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  postId!: string;

  @Column({ type: 'text' })
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
