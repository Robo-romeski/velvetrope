import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'events' })
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  hostId!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text' })
  date!: string; // ISO

  @Column({ type: 'integer' })
  capacity!: number;

  @Column({ type: 'text', default: 'draft' })
  status!: 'draft' | 'published' | 'cancelled';
}
