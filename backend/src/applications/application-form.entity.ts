import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'application_forms' })
export class ApplicationFormEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  eventId!: string;

  @Column({ type: 'text' })
  schema!: string; // JSON string

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}


