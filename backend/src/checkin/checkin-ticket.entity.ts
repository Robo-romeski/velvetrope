import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @CreateDateColumn({ type: 'datetime' })
  issuedAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  usedAt?: Date | null;
}
