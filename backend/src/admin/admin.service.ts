import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdminAuditEntity } from './admin-audit.entity';
import { UserEntity, AccountStatus } from '../auth/user.entity';
import { EventEntity } from '../events/event.entity';
import { TrustReportEntity } from '../trust/report.entity';
import {
  IdentityVerificationEntity,
  IdentityVerificationStatus,
} from '../identity/identity-verification.entity';

const ALLOWED_ROLES = new Set(['attendee', 'host', 'admin']);

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
    @InjectRepository(TrustReportEntity)
    private readonly reports: Repository<TrustReportEntity>,
    @InjectRepository(AdminAuditEntity)
    private readonly audit: Repository<AdminAuditEntity>,
    @InjectRepository(IdentityVerificationEntity)
    private readonly identity: Repository<IdentityVerificationEntity>,
  ) {}

  async summary(): Promise<{
    users: number;
    suspendedUsers: number;
    events: number;
    cancelledEvents: number;
    openReports: number;
  }> {
    const [users, suspendedUsers, events, cancelledEvents, openReports] =
      await Promise.all([
        this.users.count(),
        this.users.count({ where: { accountStatus: 'suspended' } }),
        this.events.count(),
        this.events.count({ where: { status: 'cancelled' } }),
        this.reports.count({ where: { status: 'open' } }),
      ]);
    return { users, suspendedUsers, events, cancelledEvents, openReports };
  }

  async listUsers(input: {
    page?: number;
    pageSize?: number;
    query?: string;
    status?: AccountStatus | 'all';
  }): Promise<{
    items: Array<{
      id: string;
      email: string;
      name: string | null;
      roles: string[];
      accountStatus: AccountStatus;
      suspendedAt: string | null;
      suspensionReason: string | null;
      identityStatus: IdentityVerificationStatus;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, Math.floor(input.page ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Math.floor(input.pageSize ?? 20)),
    );
    const query = input.query?.trim().toLowerCase();
    const qb = this.users.createQueryBuilder('user');
    if (query) {
      qb.andWhere(
        `(LOWER(user.email) LIKE :query OR LOWER(COALESCE(user.name, '')) LIKE :query)`,
        { query: `%${query}%` },
      );
    }
    if (input.status && input.status !== 'all') {
      qb.andWhere('user.accountStatus = :status', { status: input.status });
    }
    const [users, total] = await qb
      .orderBy('user.email', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    const identityRows =
      users.length === 0
        ? []
        : await this.identity.find({
            where: { userSub: In(users.map((user) => user.id)) },
          });
    const identityByUser = new Map(
      identityRows.map((item) => [item.userSub, item.status]),
    );

    return {
      items: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        roles: user.roles,
        accountStatus: user.accountStatus,
        suspendedAt: user.suspendedAt?.toISOString() ?? null,
        suspensionReason: user.suspensionReason ?? null,
        identityStatus: identityByUser.get(user.id) ?? 'not_started',
      })),
      total,
      page,
      pageSize,
    };
  }

  async updateUser(
    actorSub: string,
    userId: string,
    input: {
      roles?: string[];
      accountStatus?: AccountStatus;
      suspensionReason?: string;
    },
  ): Promise<{
    id: string;
    email: string;
    roles: string[];
    accountStatus: AccountStatus;
  }> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (
      actorSub === userId &&
      (input.roles !== undefined || input.accountStatus === 'suspended')
    ) {
      throw new BadRequestException(
        'Admins cannot change their own roles or suspend themselves',
      );
    }

    const changes: Record<string, unknown> = {};
    if (input.roles !== undefined) {
      const roles = [...new Set(input.roles.map((role) => role.trim()))].filter(
        Boolean,
      );
      if (
        roles.length === 0 ||
        roles.some((role) => !ALLOWED_ROLES.has(role))
      ) {
        throw new BadRequestException('Invalid roles');
      }
      if (user.roles.includes('admin') && !roles.includes('admin')) {
        const admins = (await this.users.find()).filter(
          (candidate) =>
            candidate.id !== user.id &&
            candidate.accountStatus === 'active' &&
            candidate.roles.includes('admin'),
        );
        if (admins.length === 0) {
          throw new BadRequestException('Cannot remove the last active admin');
        }
      }
      user.roles = roles;
      changes.roles = roles;
    }

    if (input.accountStatus !== undefined) {
      if (!['active', 'suspended'].includes(input.accountStatus)) {
        throw new BadRequestException('Invalid account status');
      }
      user.accountStatus = input.accountStatus;
      if (input.accountStatus === 'suspended') {
        const reason = input.suspensionReason?.trim();
        if (!reason) {
          throw new BadRequestException('Suspension reason required');
        }
        user.suspendedAt = new Date();
        user.suspensionReason = reason.slice(0, 1000);
      } else {
        user.suspendedAt = null;
        user.suspensionReason = null;
      }
      changes.accountStatus = input.accountStatus;
      changes.suspensionReason = user.suspensionReason ?? null;
    }

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('No supported changes provided');
    }

    const saved = await this.users.save(user);
    await this.recordAudit({
      actorSub,
      action: 'user.updated',
      targetType: 'user',
      targetId: saved.id,
      metadata: changes,
    });
    return {
      id: saved.id,
      email: saved.email,
      roles: saved.roles,
      accountStatus: saved.accountStatus,
    };
  }

  async listEvents(input: {
    page?: number;
    pageSize?: number;
    query?: string;
    status?: EventEntity['status'] | 'all';
  }): Promise<{
    items: EventEntity[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, Math.floor(input.page ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Math.floor(input.pageSize ?? 20)),
    );
    const query = input.query?.trim().toLowerCase();
    const qb = this.events.createQueryBuilder('event');
    if (query) {
      qb.andWhere('LOWER(event.title) LIKE :query', {
        query: `%${query}%`,
      });
    }
    if (input.status && input.status !== 'all') {
      qb.andWhere('event.status = :status', { status: input.status });
    }
    const [items, total] = await qb
      .orderBy('event.date', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { items, total, page, pageSize };
  }

  async cancelEvent(
    actorSub: string,
    eventId: string,
    reason?: string,
  ): Promise<EventEntity> {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status === 'cancelled') return event;
    event.status = 'cancelled';
    const saved = await this.events.save(event);
    await this.recordAudit({
      actorSub,
      action: 'event.cancelled',
      targetType: 'event',
      targetId: saved.id,
      metadata: { reason: reason?.trim().slice(0, 1000) || null },
    });
    return saved;
  }

  async listAudit(limit = 100): Promise<AdminAuditEntity[]> {
    return await this.audit.find({
      order: { createdAt: 'DESC' },
      take: Math.min(200, Math.max(1, Math.floor(limit))),
    });
  }

  async recordAudit(input: {
    actorSub: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.audit.save(
      this.audit.create({
        actorSub: input.actorSub,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      }),
    );
  }
}
