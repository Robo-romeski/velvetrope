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

  @Column({ type: 'boolean', default: true })
  isDiscoveryVisible!: boolean;

  /** 0 = free ticket (default). */
  @Column({ type: 'integer', default: 0 })
  ticketPriceCents!: number;

  @Column({ type: 'boolean', default: false })
  requirePhotoCheckin!: boolean;

  @Column({ type: 'boolean', default: false })
  requireIdentityVerification!: boolean;

  /** Shown on public invitation (e.g. neighborhood or borough). */
  @Column({ type: 'text', nullable: true })
  locationPublicLabel?: string | null;

  /** Full address — only exposed to host and approved attendees via API. */
  @Column({ type: 'text', nullable: true })
  locationExactAddress?: string | null;
}
