import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from './event.entity';
import { ApplicationEntity } from '../applications/application.entity';

export interface EventItem {
  id: string;
  hostId: string;
  title: string;
  description?: string | null;
  date: string; // ISO
  capacity: number;
  status: EventEntity['status'];
  ticketPriceCents: number;
}

export type HostEventItem = EventItem & {
  approvedCount: number;
  pendingCount: number;
};

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly repo: Repository<EventEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applications: Repository<ApplicationEntity>,
  ) {}

  async listPublished(): Promise<EventItem[]> {
    return await this.repo.find({
      where: { status: 'published' },
      order: { date: 'ASC' },
    });
  }

  async listByHost(hostId: string): Promise<HostEventItem[]> {
    const events = await this.repo.find({
      where: { hostId },
      order: { date: 'ASC' },
    });
    if (events.length === 0) return [];

    const ids = events.map((event) => event.id);
    const rows = await this.applications
      .createQueryBuilder('a')
      .select('a.eventId', 'eventId')
      .addSelect(
        `SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END)`,
        'approved',
      )
      .addSelect(
        `SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END)`,
        'pending',
      )
      .where('a.eventId IN (:...ids)', { ids })
      .groupBy('a.eventId')
      .getRawMany<{ eventId: string; approved: string; pending: string }>();

    const counts = new Map(
      rows.map((row) => [
        row.eventId,
        {
          approved: Number(row.approved) || 0,
          pending: Number(row.pending) || 0,
        },
      ]),
    );

    return events.map((event) => ({
      ...event,
      approvedCount: counts.get(event.id)?.approved ?? 0,
      pendingCount: counts.get(event.id)?.pending ?? 0,
    }));
  }

  async get(id: string): Promise<EventItem> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Event not found');
    return item;
  }

  async create(
    data: Omit<EventItem, 'id' | 'status'> & { status?: EventItem['status'] },
  ): Promise<EventItem> {
    const ticketPriceCents = Math.max(0, Math.floor(data.ticketPriceCents ?? 0));
    const entity = this.repo.create({
      ...data,
      ticketPriceCents,
      status: data.status ?? 'draft',
    } as Partial<EventEntity>);
    const saved = await this.repo.save(entity);
    return saved;
  }

  async requireHost(id: string, hostSub: string): Promise<EventEntity> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');
    if (existing.hostId !== hostSub)
      throw new ForbiddenException('Not the event host');
    return existing;
  }

  async update(
    id: string,
    hostSub: string,
    data: Partial<Omit<EventItem, 'id' | 'hostId'>>,
  ): Promise<EventItem> {
    const existing = await this.requireHost(id, hostSub);
    const patch = { ...data } as Partial<EventEntity>;
    if (patch.ticketPriceCents !== undefined) {
      patch.ticketPriceCents = Math.max(
        0,
        Math.floor(Number(patch.ticketPriceCents)),
      );
    }
    const merged = this.repo.merge(existing, patch);
    const saved = await this.repo.save(merged);
    return saved;
  }

  async remove(id: string, hostSub: string): Promise<void> {
    await this.requireHost(id, hostSub);
    const res = await this.repo.delete({ id });
    if (res.affected === 0) throw new NotFoundException('Event not found');
  }
}
