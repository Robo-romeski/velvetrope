import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PostAudience = 'group' | 'members' | 'followers';

@Entity({ name: 'group_posts' })
@Index(['groupId', 'createdAt'])
@Index('IDX_group_posts_author_created', ['authorId', 'createdAt'])
export class GroupPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: true })
  groupId!: string | null;

  @Column({ type: 'text' })
  authorId!: string;

  @Column({ type: 'text', nullable: true })
  title?: string | null;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'text', default: 'group' })
  audience!: PostAudience;

  @Column({ type: 'text', nullable: true })
  linkUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  eventId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
