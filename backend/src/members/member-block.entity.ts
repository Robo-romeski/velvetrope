import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'member_blocks' })
@Index(['blockerId', 'blockedId'], { unique: true })
export class MemberBlockEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  blockerId!: string;

  @Column({ type: 'text' })
  blockedId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
