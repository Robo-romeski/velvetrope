import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

export type EventPaymentStatus = 'pending' | 'paid' | 'failed';

@Entity({ name: 'event_payments' })
@Index(['eventId', 'userSub'], { unique: true })
export class EventPaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  eventId!: string;

  @Column({ type: 'text' })
  userSub!: string;

  @Column({ type: 'integer' })
  amountCents!: number;

  @Column({ type: 'text', default: 'pending' })
  status!: EventPaymentStatus;

  @Column({ type: 'text', nullable: true })
  stripeCheckoutSessionId?: string | null;

  @Column({ type: 'text', nullable: true })
  stripePaymentIntentId?: string | null;

  @Column({ type: dateTimeColumnType(), nullable: true })
  paidAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
