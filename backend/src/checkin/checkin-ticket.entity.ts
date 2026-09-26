import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

@Entity({ name: 'checkin_tickets' })
export class CheckinTicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  token!: string;

  @Column({ type: 'text' })
  eventId!: string;

  @Column({ type: 'text' })
  userSub!: string;

  @CreateDateColumn()
  issuedAt!: Date;

  @Column({ type: dateTimeColumnType(), nullable: true })
  usedAt?: Date | null;
}
