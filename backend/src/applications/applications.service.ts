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

export interface CreateApplicationDto {
  eventId: string;
  applicantSub: string;
  answers?: unknown;
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
  ) {}

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
    app.status = decision.status;
    // reason could be stored later
    return await this.repo.save(app);
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
