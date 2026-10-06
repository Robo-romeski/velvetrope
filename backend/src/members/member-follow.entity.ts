import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'member_follows' })
@Index(['followerId', 'followingId'], { unique: true })
export class MemberFollowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  followerId!: string;

  @Column({ type: 'text' })
  followingId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
