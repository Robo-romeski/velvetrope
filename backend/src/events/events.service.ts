import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from './event.entity';
import { rejectPaidPricingWhenDisabled } from '../config/payments-enabled';
import { ApplicationEntity } from '../applications/application.entity';
import { isAutomatedTestEventTitle } from '../maintenance/automated-test-content';

export interface EventItem {
  id: string;
  hostId: string;
  title: string;
  description?: string | null;
  date: string; // ISO
  capacity: number;
  status: EventEntity['status'];
  isDiscoveryVisible: boolean;
  ticketPriceCents: number;
  requirePhotoCheckin: boolean;
  requireIdentityVerification: boolean;
  locationPublicLabel?: string | null;
  locationExactAddress?: string | null;
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
    const nowIso = new Date().toISOString();
    const rows = await this.repo.find({
      where: { status: 'published', isDiscoveryVisible: true },
      order: { date: 'ASC' },
    });
    const eligible = rows
      .filter((event) => !isAutomatedTestEventTitle(event.title))
      .filter((event) => String(event.date) >= nowIso);
    return Promise.all(
      eligible.map((event) => this.toViewerEvent(event, null)),
    );
  }

  async searchPublished(query = ''): Promise<EventItem[]> {
    const needle = query.trim().toLowerCase().slice(0, 80);
    const rows = await this.listPublished();
    if (!needle) return rows.slice(0, 12);
    const scored = rows
      .map((event) => ({
        event,
        score: this.eventSearchScore(event, needle),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map((entry) => entry.event);
  }

  private eventSearchScore(event: EventItem, needle: string): number {
    const title = event.title.toLowerCase();
    const description = (event.description ?? '').toLowerCase();
    if (title === needle) return 1000;
    if (title.startsWith(needle)) return 800;
    if (title.includes(needle)) return 500;
    if (description.includes(needle)) return 300;
    return 0;
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

  async get(id: string): Promise<EventEntity> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Event not found');
    return item;
  }

  async getForViewer(id: string, viewerId: string | null): Promise<EventItem> {
    const entity = await this.get(id);
    if (entity.status === 'draft' && entity.hostId !== viewerId) {
      throw new NotFoundException('Event not found');
    }
    return this.toViewerEvent(entity, viewerId);
  }

  private async canViewExactLocation(
    event: EventEntity,
    viewerId: string | null,
  ): Promise<boolean> {
    if (!event.locationExactAddress?.trim()) return false;
    if (!viewerId) return false;
    if (viewerId === event.hostId) return true;
    const approved = await this.applications.findOne({
      where: {
        eventId: event.id,
        applicantSub: viewerId,
        status: 'approved',
      },
    });
    return Boolean(approved);
  }

  private toViewerEventSync(
    event: EventEntity,
    viewerId: string | null,
    exactAllowed: boolean,
  ): EventItem {
    return {
      id: event.id,
      hostId: event.hostId,
      title: event.title,
      description: event.description ?? null,
      date: String(event.date),
      capacity: event.capacity,
      status: event.status,
      isDiscoveryVisible: event.isDiscoveryVisible,
      ticketPriceCents: event.ticketPriceCents,
      requirePhotoCheckin: event.requirePhotoCheckin,
      requireIdentityVerification: event.requireIdentityVerification,
      locationPublicLabel: event.locationPublicLabel?.trim() || null,
      locationExactAddress: exactAllowed
        ? event.locationExactAddress?.trim() || null
        : null,
    };
  }

  private async toViewerEvent(
    event: EventEntity,
    viewerId: string | null,
  ): Promise<EventItem> {
    const exactAllowed = await this.canViewExactLocation(event, viewerId);
    return this.toViewerEventSync(event, viewerId, exactAllowed);
  }

  async listLinkableForMember(
    userId: string,
  ): Promise<Array<{ id: string; title: string; date: string }>> {
    const byId = new Map<string, EventEntity>();
    const discoverable = await this.repo.find({
      where: { status: 'published', isDiscoveryVisible: true },
      order: { date: 'ASC' },
    });
    for (const event of discoverable) byId.set(event.id, event);
    const hosted = await this.repo.find({
      where: { hostId: userId, status: 'published' },
    });
    for (const event of hosted) byId.set(event.id, event);

    const approvedApps = await this.applications.find({
      where: { applicantSub: userId, status: 'approved' },
    });
    for (const app of approvedApps) {
      const event = await this.repo.findOne({
        where: { id: app.eventId, status: 'published' },
      });
      if (event) byId.set(event.id, event);
    }

    return [...byId.values()]
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((event) => ({
        id: event.id,
        title: event.title,
        date: String(event.date),
      }));
  }

  async assertMemberCanLinkEvent(
    userId: string,
    eventId: string,
  ): Promise<EventEntity> {
    const event = await this.repo.findOne({ where: { id: eventId } });
    if (!event || event.status !== 'published') {
      throw new ForbiddenException('Published gathering required');
    }
    if (event.hostId === userId) return event;
    if (event.isDiscoveryVisible) return event;
    const approved = await this.applications.findOne({
      where: { eventId, applicantSub: userId, status: 'approved' },
    });
    if (approved) return event;
    throw new ForbiddenException('You cannot link this gathering');
  }

  async canViewerSeeLinkedEvent(
    viewerId: string | null,
    event: EventEntity,
    authorId: string,
  ): Promise<boolean> {
    if (event.status !== 'published') return false;
    if (!viewerId) return false;
    if (event.isDiscoveryVisible) return true;
    if (viewerId === event.hostId || viewerId === authorId) return true;
    const approved = await this.applications.findOne({
      where: { eventId: event.id, applicantSub: viewerId, status: 'approved' },
    });
    return Boolean(approved);
  }

  async resolveLinkedEventForViewer(
    eventId: string,
    viewerId: string | null,
    authorId: string,
  ): Promise<{ id: string; title: string } | null> {
    const event = await this.repo.findOne({ where: { id: eventId } });
    if (!event) return null;
    if (!(await this.canViewerSeeLinkedEvent(viewerId, event, authorId))) {
      return null;
    }
    return { id: event.id, title: event.title };
  }

  async create(
    data: Omit<
      EventItem,
      | 'id'
      | 'status'
      | 'ticketPriceCents'
      | 'isDiscoveryVisible'
      | 'requirePhotoCheckin'
      | 'requireIdentityVerification'
    > & {
      status?: EventItem['status'];
      isDiscoveryVisible?: boolean;
      ticketPriceCents?: number;
      requirePhotoCheckin?: boolean;
      requireIdentityVerification?: boolean;
    },
  ): Promise<EventItem> {
    const ticketPriceCents = Math.max(
      0,
      Math.floor(data.ticketPriceCents ?? 0),
    );
    rejectPaidPricingWhenDisabled(ticketPriceCents);
    const entity = this.repo.create({
      ...this.normalizeLocationFields(data as Partial<EventEntity>),
      ticketPriceCents,
      isDiscoveryVisible: data.isDiscoveryVisible ?? true,
      requirePhotoCheckin: data.requirePhotoCheckin ?? false,
      requireIdentityVerification: data.requireIdentityVerification ?? false,
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
      rejectPaidPricingWhenDisabled(patch.ticketPriceCents);
    }
    if (patch.locationPublicLabel !== undefined) {
      patch.locationPublicLabel =
        patch.locationPublicLabel?.trim().slice(0, 200) || null;
    }
    if (patch.locationExactAddress !== undefined) {
      patch.locationExactAddress =
        patch.locationExactAddress?.trim().slice(0, 500) || null;
    }
    const merged = this.repo.merge(existing, patch);
    const saved = await this.repo.save(merged);
    return saved;
  }

  private normalizeLocationFields(
    data: Partial<EventEntity>,
  ): Partial<EventEntity> {
    const next = { ...data };
    if (next.locationPublicLabel !== undefined) {
      next.locationPublicLabel =
        next.locationPublicLabel?.trim().slice(0, 200) || null;
    }
    if (next.locationExactAddress !== undefined) {
      next.locationExactAddress =
        next.locationExactAddress?.trim().slice(0, 500) || null;
    }
    return next;
  }

  async remove(id: string, hostSub: string): Promise<void> {
    await this.requireHost(id, hostSub);
    const res = await this.repo.delete({ id });
    if (res.affected === 0) throw new NotFoundException('Event not found');
  }
}
