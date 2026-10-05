import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ApplicationEntity, ApplicationStatus } from './application.entity';
import { ApplicationFormEntity } from './application-form.entity';
import { InvitesService } from '../invites/invites.service';
import { EventsService } from '../events/events.service';
import { EventEntity } from '../events/event.entity';
import { UserEntity } from '../auth/user.entity';
import { EmailService } from '../email/email.service';

export interface CreateApplicationDto {
  eventId: string;
  applicantSub: string;
  answers?: unknown;
  acceptedCodeOfConduct?: boolean;
}

export interface DecisionDto {
  status: Extract<ApplicationStatus, 'approved' | 'waitlisted' | 'rejected'>;
  reason?: string;
}

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly repo: Repository<ApplicationEntity>,
    @InjectRepository(ApplicationFormEntity)
    private readonly forms: Repository<ApplicationFormEntity>,
    private readonly invites: InvitesService,
    private readonly events: EventsService,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly email: EmailService,
    private readonly dataSource: DataSource,
  ) {}

  async listForApplicant(applicantSub: string): Promise<{
    items: Array<{
      id: string;
      eventId: string;
      eventTitle: string;
      eventStatus: string;
      status: ApplicationStatus;
      createdAt: string;
      decisionReason: string | null;
      decidedAt: string | null;
      waitlistPosition: number | null;
    }>;
  }> {
    const applications = await this.repo.find({
      where: { applicantSub },
      order: { createdAt: 'DESC' },
    });
    if (applications.length === 0) {
      return { items: [] };
    }

    const eventIds = [...new Set(applications.map((a) => a.eventId))];
    const events = await Promise.all(
      eventIds.map((id) => this.events.get(id).catch(() => null)),
    );
    const eventById = new Map(
      events.filter(Boolean).map((event) => [event!.id, event!]),
    );
    const waitlisted = await this.repo.find({
      where: {
        eventId: In(eventIds),
        status: 'waitlisted',
      },
      order: {
        waitlistRank: 'ASC',
        waitlistedAt: 'ASC',
        createdAt: 'ASC',
        id: 'ASC',
      },
    });
    const waitlistPositions = new Map<string, number>();
    const nextPositionByEvent = new Map<string, number>();
    for (const application of waitlisted) {
      const position = (nextPositionByEvent.get(application.eventId) ?? 0) + 1;
      nextPositionByEvent.set(application.eventId, position);
      waitlistPositions.set(application.id, position);
    }

    const items = applications.map((app) => {
      const event = eventById.get(app.eventId);
      return {
        id: app.id,
        eventId: app.eventId,
        eventTitle: event?.title ?? app.eventId,
        eventStatus: event?.status ?? 'unknown',
        status: app.status,
        createdAt: app.createdAt.toISOString(),
        decisionReason: app.decisionReason ?? null,
        decidedAt: app.decidedAt?.toISOString() ?? null,
        waitlistPosition: waitlistPositions.get(app.id) ?? null,
      };
    });

    return { items };
  }

  async listForEvent(
    eventId: string,
    opts?: {
      page?: number;
      pageSize?: number;
      status?: ApplicationStatus | 'all';
    },
  ): Promise<{
    items: ApplicationEntity[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, Math.floor(opts?.page ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Math.floor(opts?.pageSize ?? 10)),
    );
    const where: any = { eventId };
    if (opts?.status && opts.status !== 'all') where.status = opts.status;
    const [items, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order:
        opts?.status === 'waitlisted'
          ? {
              waitlistRank: 'ASC',
              waitlistedAt: 'ASC',
              createdAt: 'ASC',
              id: 'ASC',
            }
          : { createdAt: 'DESC' },
    });
    return { items, total, page, pageSize };
  }

  async submit(
    dto: CreateApplicationDto & { inviteCode?: string },
  ): Promise<ApplicationEntity> {
    // Validate against form schema if present
    const form = await this.forms.findOne({ where: { eventId: dto.eventId } });
    if (form) {
      try {
        const schema = JSON.parse(form.schema || '{}');
        const fields: Array<{ name: string; required?: boolean }> =
          Array.isArray(schema?.fields) ? schema.fields : [];
        const requiredNames = fields
          .filter((f) => f?.required)
          .map((f) => f.name)
          .filter(Boolean);
        const answers = (dto.answers ?? {}) as Record<string, unknown>;
        const missing = requiredNames.filter((n) => {
          const v = answers[n];
          return (
            v === undefined ||
            v === null ||
            (typeof v === 'string' && v.trim() === '')
          );
        });
        if (missing.length > 0) {
          throw new BadRequestException(
            `Missing required fields: ${missing.join(', ')}`,
          );
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        // If schema parse fails, treat as no validation
      }
    }

    if (dto.acceptedCodeOfConduct !== true) {
      throw new BadRequestException('Code of conduct acceptance required');
    }

    const existing = await this.repo.findOne({
      where: {
        eventId: dto.eventId,
        applicantSub: dto.applicantSub,
      },
    });
    if (existing) {
      throw new ConflictException('You already applied to this event');
    }

    // Require a valid invite code and redeem it prior to saving
    const code = (dto.inviteCode || '').trim();
    if (!code) {
      throw new BadRequestException('Invite code required');
    }
    const result = await this.invites.validate(code);
    if (!result.valid) {
      throw new BadRequestException('Invalid invite code');
    }
    if (result.eventId && result.eventId !== dto.eventId) {
      throw new BadRequestException('Invite code not valid for this event');
    }
    if (result.used) {
      if (result.usedBy !== dto.applicantSub) {
        throw new BadRequestException('Invite code already used');
      }
    } else {
      await this.invites.redeem(code, dto.applicantSub);
    }

    const entity = this.repo.create({
      eventId: dto.eventId,
      applicantSub: dto.applicantSub,
      answers: dto.answers ? JSON.stringify(dto.answers) : null,
      status: 'pending',
      codeOfConductAcceptedAt: new Date(),
    });
    return await this.repo.save(entity);
  }

  async get(id: string): Promise<ApplicationEntity> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Application not found');
    return item;
  }

  async findApproved(
    eventId: string,
    userSub: string,
  ): Promise<ApplicationEntity | null> {
    return await this.repo.findOne({
      where: { eventId, applicantSub: userSub, status: 'approved' },
    });
  }

  async decide(
    id: string,
    decision: DecisionDto,
    decidedByHostId: string,
  ): Promise<ApplicationEntity> {
    if (!['approved', 'waitlisted', 'rejected'].includes(decision.status)) {
      throw new BadRequestException('Invalid application decision');
    }
    const reason = this.normalizeReason(decision.reason);
    const saved = await this.dataSource.transaction(
      'SERIALIZABLE',
      async (manager) => {
        const applications = manager.getRepository(ApplicationEntity);
        const app = await applications.findOne({ where: { id } });
        if (!app) throw new NotFoundException('Application not found');

        if (app.status === 'waitlisted' && decision.status === 'approved') {
          throw new BadRequestException(
            'Use waitlist promotion to approve a waitlisted attendee',
          );
        }
        if (
          app.status !== 'pending' &&
          !(
            (app.status === 'waitlisted' || app.status === 'approved') &&
            decision.status === 'rejected'
          )
        ) {
          throw new BadRequestException(
            `Cannot change an application from ${app.status} to ${decision.status}`,
          );
        }

        if (decision.status === 'approved') {
          const event = await manager
            .getRepository(EventEntity)
            .findOne({ where: { id: app.eventId } });
          if (!event) throw new NotFoundException('Event not found');
          const approved = await applications.count({
            where: { eventId: app.eventId, status: 'approved' },
          });
          if (approved >= event.capacity) {
            throw new BadRequestException(
              'Event is at capacity; add the application to the waitlist',
            );
          }
        }

        const now = new Date();
        app.status = decision.status;
        app.decisionReason = reason;
        app.decidedAt = now;
        app.decidedByHostId = decidedByHostId;
        if (decision.status === 'waitlisted') {
          const maxRank = await applications
            .createQueryBuilder('application')
            .select('MAX(application.waitlistRank)', 'max')
            .where('application.eventId = :eventId', {
              eventId: app.eventId,
            })
            .getRawOne<{ max: number | string | null }>();
          app.waitlistedAt = now;
          app.waitlistRank = Number(maxRank?.max ?? 0) + 1;
        } else {
          app.waitlistedAt = null;
        }
        return await applications.save(app);
      },
    );

    await this.notifyApplicantDecision(saved, {
      status: saved.status as DecisionDto['status'],
      reason: saved.decisionReason ?? undefined,
    });
    return saved;
  }

  async promote(
    id: string,
    decidedByHostId: string,
  ): Promise<ApplicationEntity> {
    const saved = await this.dataSource.transaction(
      'SERIALIZABLE',
      async (manager) => {
        const applications = manager.getRepository(ApplicationEntity);
        const app = await applications.findOne({ where: { id } });
        if (!app) throw new NotFoundException('Application not found');
        if (app.status !== 'waitlisted') {
          throw new BadRequestException('Application is not waitlisted');
        }

        const first = await applications.findOne({
          where: { eventId: app.eventId, status: 'waitlisted' },
          order: {
            waitlistRank: 'ASC',
            waitlistedAt: 'ASC',
            createdAt: 'ASC',
            id: 'ASC',
          },
        });
        if (!first || first.id !== app.id) {
          throw new BadRequestException(
            'Only the first attendee in the waitlist can be promoted',
          );
        }

        const event = await manager
          .getRepository(EventEntity)
          .findOne({ where: { id: app.eventId } });
        if (!event) throw new NotFoundException('Event not found');
        const approved = await applications.count({
          where: { eventId: app.eventId, status: 'approved' },
        });
        if (approved >= event.capacity) {
          throw new BadRequestException('Event is at capacity');
        }

        const now = new Date();
        app.status = 'approved';
        app.decidedAt = now;
        app.decidedByHostId = decidedByHostId;
        app.promotedAt = now;
        return await applications.save(app);
      },
    );

    await this.notifyApplicantDecision(saved, {
      status: 'approved',
      reason: saved.decisionReason ?? undefined,
    });
    return saved;
  }

  private async notifyApplicantDecision(
    app: ApplicationEntity,
    decision: DecisionDto,
  ): Promise<void> {
    const user = await this.users.findOne({
      where: { id: app.applicantSub },
    });
    if (!user?.email) return;

    let eventTitle = app.eventId;
    try {
      const event = await this.events.get(app.eventId);
      eventTitle = event.title;
    } catch {
      // use event id fallback
    }

    try {
      await this.email.sendApplicationDecision({
        to: user.email,
        eventTitle,
        eventId: app.eventId,
        status: decision.status,
        reason: decision.reason,
      });
    } catch {
      // Decision is already persisted; do not fail the host action.
    }
  }

  private normalizeReason(reason?: string): string | null {
    const normalized = reason?.trim();
    if (!normalized) return null;
    if (normalized.length > 1000) {
      throw new BadRequestException(
        'Decision reason must be 1000 characters or fewer',
      );
    }
    return normalized;
  }

  async setFormSchema(
    eventId: string,
    schema: unknown,
  ): Promise<ApplicationFormEntity> {
    const existing = await this.forms.findOne({ where: { eventId } });
    if (existing) {
      existing.schema = JSON.stringify(schema ?? {});
      return await this.forms.save(existing);
    }
    const created = this.forms.create({
      eventId,
      schema: JSON.stringify(schema ?? {}),
    });
    return await this.forms.save(created);
  }

  async getFormSchema(
    eventId: string,
  ): Promise<{ eventId: string; schema: unknown } | null> {
    const form = await this.forms.findOne({ where: { eventId } });
    if (!form) return null;
    return { eventId: form.eventId, schema: JSON.parse(form.schema) };
  }
}
