import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @Column({ type: 'datetime', nullable: true })
  paidAt?: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
