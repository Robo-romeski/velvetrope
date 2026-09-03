import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('stripe_accounts')
@Unique(['hostId'])
export class StripeAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  hostId!: string;

  @Column({ type: 'text' })
  accountId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}


