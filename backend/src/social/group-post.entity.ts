import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'group_posts' })
@Index(['groupId', 'createdAt'])
export class GroupPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  groupId!: string;

  @Column({ type: 'text' })
  authorId!: string;

  @Column({ type: 'text', nullable: true })
  title?: string | null;

  @Column({ type: 'text' })
  body!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
