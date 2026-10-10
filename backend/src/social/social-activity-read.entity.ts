import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { dateTimeColumnType } from '../database/column-types';

@Entity({ name: 'social_activity_reads' })
export class SocialActivityReadEntity {
  @PrimaryColumn({ type: 'text' })
  userId!: string;

  @Column({ type: dateTimeColumnType(), nullable: true })
  lastReadAt!: Date | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}
