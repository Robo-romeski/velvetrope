import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationEntity, ApplicationStatus } from './application.entity';
import { ApplicationFormEntity } from './application-form.entity';
import { InvitesService } from '../invites/invites.service';
import { EventsService } from '../events/events.service';
import { UserEntity } from '../auth/user.entity';
import { EmailService } from '../email/email.service';

export interface CreateApplicationDto {
  eventId: string;
  applicantSub: string;
  answers?: unknown;
  acceptedCodeOfConduct?: boolean;
}

export interface DecisionDto {
  status: Extract<ApplicationStatus, 'approved' | 'rejected'>;
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
  ) {}

  async listForApplicant(applicantSub: string): Promise<{
    items: Array<{
      id: string;
      eventId: string;
      eventTitle: string;
      eventStatus: string;
      status: ApplicationStatus;
      createdAt: string;
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

    const items = applications.map((app) => {
      const event = eventById.get(app.eventId);
      return {
        id: app.id,
        eventId: app.eventId,
        eventTitle: event?.title ?? app.eventId,
        eventStatus: event?.status ?? 'unknown',
        status: app.status,
        createdAt: app.createdAt.toISOString(),
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
      order: { createdAt: 'DESC' },
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

    // Require a valid invite code and redeem it prior to saving
    const code = (dto.inviteCode || '').trim();
    if (!code) {
      throw new BadRequestException('Invite code required');
    }
    const result = await this.invites.validate(code);
    if (!result.valid) {
      throw new BadRequestException('Invalid invite code');
    }
    if (result.used) {
      throw new BadRequestException('Invite code already used');
    }
    if (result.eventId && result.eventId !== dto.eventId) {
      throw new BadRequestException('Invite code not valid for this event');
    }
    // redeem (consume) the invite for this applicant
    await this.invites.redeem(code, dto.applicantSub);

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

  async decide(id: string, decision: DecisionDto): Promise<ApplicationEntity> {
    const app = await this.get(id);
    const previousStatus = app.status;
    if (decision.status === 'approved' && app.status !== 'approved') {
      const event = await this.events.get(app.eventId);
      const approved = await this.repo.count({
        where: { eventId: app.eventId, status: 'approved' },
      });
      if (approved >= event.capacity) {
        throw new BadRequestException('Event is at capacity');
      }
    }
    app.status = decision.status;
    const saved = await this.repo.save(app);
    if (
      previousStatus !== decision.status &&
      (decision.status === 'approved' || decision.status === 'rejected')
    ) {
      await this.notifyApplicantDecision(saved, decision);
    }
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
