import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'commerce_refunds' })
export class RefundEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  orderId!: string;

  @Column({ type: 'text' })
  orderLineId!: string;

  @Column({ type: 'integer' })
  amountCents!: number;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
