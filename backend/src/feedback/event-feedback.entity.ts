import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'event_feedback' })
@Index(['eventId', 'userSub'], { unique: true })
export class EventFeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  eventId!: string;

  @Column({ type: 'text' })
  userSub!: string;

  @Column({ type: 'integer' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ type: 'boolean', default: true })
  anonymous!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
