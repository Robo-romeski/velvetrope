import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrustReportEntity, ReportCategory } from './report.entity';
import { codeOfConductSummary } from './code-of-conduct';
import { EmailService } from '../email/email.service';
import { UserEntity } from '../auth/user.entity';
import { ApplicationEntity } from '../applications/application.entity';
import { EventEntity } from '../events/event.entity';
import { CheckinTicketEntity } from '../checkin/checkin-ticket.entity';
import { EventPaymentEntity } from '../stripe/event-payment.entity';
import { StripeAccountEntity } from '../stripe/stripe-account.entity';
import { verifyPassword } from '../auth/password';

const REPORT_CATEGORIES: ReportCategory[] = [
  'harassment',
  'safety',
  'spam',
  'other',
];

@Injectable()
export class TrustService {
  constructor(
    @InjectRepository(TrustReportEntity)
    private readonly reports: Repository<TrustReportEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applications: Repository<ApplicationEntity>,
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
    @InjectRepository(CheckinTicketEntity)
    private readonly tickets: Repository<CheckinTicketEntity>,
    @InjectRepository(EventPaymentEntity)
    private readonly payments: Repository<EventPaymentEntity>,
    @InjectRepository(StripeAccountEntity)
    private readonly stripeAccounts: Repository<StripeAccountEntity>,
    private readonly email: EmailService,
  ) {}

  getCodeOfConduct() {
    return codeOfConductSummary();
  }

  async createReport(input: {
    reporterSub: string;
    subjectType: 'event' | 'user';
    subjectId: string;
    category: string;
    details: string;
  }): Promise<TrustReportEntity> {
    const subjectId = (input.subjectId ?? '').trim();
    const details = (input.details ?? '').trim();
    if (!subjectId) {
      throw new BadRequestException('subjectId required');
    }
    if (details.length < 10) {
      throw new BadRequestException(
        'Please provide at least 10 characters of detail',
      );
    }
    const category = input.category as ReportCategory;
    if (!REPORT_CATEGORIES.includes(category)) {
      throw new BadRequestException('Invalid report category');
    }

    const saved = await this.reports.save(
      this.reports.create({
        reporterSub: input.reporterSub,
        subjectType: input.subjectType,
        subjectId,
        category,
        details,
        status: 'open',
      }),
    );

    await this.notifyAdmins(saved);
    return saved;
  }

  async listReports(): Promise<TrustReportEntity[]> {
    return await this.reports.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async resolveReport(id: string): Promise<TrustReportEntity> {
    const report = await this.reports.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    report.status = 'resolved';
    return await this.reports.save(report);
  }

  async exportUserData(userId: string): Promise<{
    exportedAt: string;
    user: { id: string; email: string; name: string | null; roles: string[] };
    applications: Array<{
      id: string;
      eventId: string;
      status: string;
      createdAt: string;
      codeOfConductAcceptedAt: string | null;
    }>;
  }> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const apps = await this.applications.find({
      where: { applicantSub: userId },
      order: { createdAt: 'DESC' },
    });

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        roles: user.roles,
      },
      applications: apps.map((app) => ({
        id: app.id,
        eventId: app.eventId,
        status: app.status,
        createdAt: app.createdAt.toISOString(),
        codeOfConductAcceptedAt: app.codeOfConductAcceptedAt
          ? app.codeOfConductAcceptedAt.toISOString()
          : null,
      })),
    };
  }

  async deleteAccount(userId: string, password: string): Promise<{ ok: true }> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!(await verifyPassword(password ?? '', user.passwordHash))) {
      throw new BadRequestException('Invalid password');
    }

    const hosted = await this.events.count({ where: { hostId: userId } });
    if (hosted > 0) {
      throw new BadRequestException(
        'Remove or transfer hosted events before deleting your account',
      );
    }

    await this.applications.delete({ applicantSub: userId });
    await this.tickets.delete({ userSub: userId });
    await this.payments.delete({ userSub: userId });
    await this.reports.delete({ reporterSub: userId });
    await this.stripeAccounts.delete({ hostId: userId });
    await this.users.delete({ id: userId });

    return { ok: true };
  }

  private async notifyAdmins(report: TrustReportEntity): Promise<void> {
    const notifyEmail = process.env.TRUST_REPORT_NOTIFY_EMAIL?.trim();
    if (!notifyEmail) return;

    try {
      await this.email.send({
        to: notifyEmail,
        subject: `[VelvetKey] New trust report (${report.category})`,
        text: [
          `Report id: ${report.id}`,
          `Category: ${report.category}`,
          `Subject: ${report.subjectType} ${report.subjectId}`,
          `Reporter sub: ${report.reporterSub}`,
          '',
          report.details,
        ].join('\n'),
      });
    } catch {
      // Report is stored; delivery failure should not block submission.
    }
  }
}
