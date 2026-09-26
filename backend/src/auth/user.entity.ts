import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'text' })
  passwordHash!: string;

  @Column({ type: 'text', nullable: true })
  name?: string | null;

  @Column({ type: 'simple-json' })
  roles!: string[];

  @Column({ type: 'text', nullable: true })
  passwordResetTokenHash?: string | null;

  @Column({ type: dateTimeColumnType(), nullable: true })
  passwordResetExpiresAt?: Date | null;
}
