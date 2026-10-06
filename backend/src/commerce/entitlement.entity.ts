import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';
import type { ProductType } from './commerce.types';

@Entity({ name: 'commerce_entitlements' })
@Index(['userId', 'productType', 'productId', 'revokedAt'])
export class EntitlementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  userId!: string;

  @Column({ type: 'text' })
  productType!: ProductType;

  @Column({ type: 'text' })
  productId!: string;

  @Column({ type: 'text' })
  orderLineId!: string;

  @Column({ type: dateTimeColumnType(), nullable: true })
  revokedAt?: Date | null;

  @CreateDateColumn()
  grantedAt!: Date;
}
