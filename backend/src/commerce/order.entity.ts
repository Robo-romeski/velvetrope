import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';
import type { OrderStatus, PaymentProvider } from './commerce.types';

@Entity({ name: 'commerce_orders' })
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  buyerId!: string;

  @Column({ type: 'text', default: 'pending' })
  status!: OrderStatus;

  @Column({ type: 'text' })
  provider!: PaymentProvider;

  @Index({ unique: true })
  @Column({ type: 'text' })
  providerRef!: string;

  @Column({ type: 'text', default: 'usd' })
  currency!: string;

  @Column({ type: 'integer' })
  totalCents!: number;

  @Column({ type: dateTimeColumnType(), nullable: true })
  paidAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
