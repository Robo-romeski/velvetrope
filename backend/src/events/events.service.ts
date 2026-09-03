import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from './event.entity';

export interface EventItem {
  id: string;
  hostId: string;
  title: string;
  description?: string | null;
  date: string; // ISO
  capacity: number;
  status: EventEntity['status'];
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly repo: Repository<EventEntity>,
  ) {}

  async list(): Promise<EventItem[]> {
    return await this.repo.find();
  }

  async get(id: string): Promise<EventItem> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Event not found');
    return item;
  }

  async create(
    data: Omit<EventItem, 'id' | 'status'> & { status?: EventItem['status'] },
  ): Promise<EventItem> {
    const entity = this.repo.create({
      ...data,
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
    const merged = this.repo.merge(existing, data as Partial<EventEntity>);
    const saved = await this.repo.save(merged);
    return saved;
  }

  async remove(id: string, hostSub: string): Promise<void> {
    await this.requireHost(id, hostSub);
    const res = await this.repo.delete({ id });
    if (res.affected === 0) throw new NotFoundException('Event not found');
  }
}
