import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type GroupMemberRole = 'owner' | 'moderator' | 'member';

@Entity({ name: 'group_memberships' })
@Index(['groupId', 'userId'], { unique: true })
export class GroupMembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  groupId!: string;

  @Column({ type: 'text' })
  userId!: string;

  @Column({ type: 'text', default: 'member' })
  role!: GroupMemberRole;

  @CreateDateColumn()
  joinedAt!: Date;
}
