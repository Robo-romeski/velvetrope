import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ProductType } from './commerce.types';

@Entity({ name: 'commerce_order_lines' })
@Index(['orderId'])
export class OrderLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  orderId!: string;

  @Column({ type: 'text' })
  productType!: ProductType;

  @Column({ type: 'text' })
  productId!: string;

  @Column({ type: 'integer' })
  amountCents!: number;

  @Column({ type: 'text', nullable: true })
  payeeId?: string | null;
}
