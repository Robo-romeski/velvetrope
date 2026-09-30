import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { ApplicationEntity } from '../applications/application.entity';
import { CheckinTicketEntity } from '../checkin/checkin-ticket.entity';
import { EventEntity } from '../events/event.entity';
import { EventsService } from '../events/events.service';
import { InvitesService } from '../invites/invites.service';
import { EventPaymentEntity } from '../stripe/event-payment.entity';

type StatusCount = { status: string; count: string };

export type EventAnalytics = {
  event: {
    id: string;
    title: string;
    status: EventEntity['status'];
    date: string;
    capacity: number;
    ticketPriceCents: number;
  };
  invites: {
    total: number;
    redeemed: number;
    unused: number;
    expiredUnused: number;
    conversionRate: number;
  };
  applications: {
    total: number;
    pending: number;
    waitlisted: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  };
  payments: {
    required: boolean;
    pending: number;
    paid: number;
    failed: number;
    grossRevenueCents: number;
  };
  checkin: {
    ticketsIssued: number;
    checkedIn: number;
    attendanceRate: number;
  };
  funnel: {
    inviteToApplicationRate: number;
    approvalRate: number;
    attendanceRate: number;
  };
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applications: Repository<ApplicationEntity>,
    @InjectRepository(EventPaymentEntity)
    private readonly payments: Repository<EventPaymentEntity>,
    @InjectRepository(CheckinTicketEntity)
    private readonly tickets: Repository<CheckinTicketEntity>,
    private readonly eventsService: EventsService,
    private readonly invitesService: InvitesService,
  ) {}

  async getEvent(eventId: string): Promise<EventAnalytics> {
    const event = await this.eventsService.get(eventId);
    const [
      inviteStats,
      applicationRows,
      paymentRows,
      ticketsIssued,
      checkedIn,
    ] = await Promise.all([
      this.invitesService.statsForEvent(eventId),
      this.applications
        .createQueryBuilder('application')
        .select('application.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('application.eventId = :eventId', { eventId })
        .groupBy('application.status')
        .getRawMany<StatusCount>(),
      this.payments
        .createQueryBuilder('payment')
        .select('payment.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .addSelect(
          `COALESCE(SUM(CASE WHEN payment.status = 'paid' THEN payment.amountCents ELSE 0 END), 0)`,
          'grossRevenueCents',
        )
        .where('payment.eventId = :eventId', { eventId })
        .groupBy('payment.status')
        .getRawMany<
          StatusCount & { grossRevenueCents: string | number | null }
        >(),
      this.tickets.count({ where: { eventId } }),
      this.tickets.count({
        where: { eventId, usedAt: Not(IsNull()) },
      }),
    ]);

    const applicationCounts = this.toCountMap(applicationRows);
    const paymentCounts = this.toCountMap(paymentRows);
    const applicationsTotal = [...applicationCounts.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
    const approved = applicationCounts.get('approved') ?? 0;
    const approvalRate = this.rate(approved, applicationsTotal);
    const attendanceRate = this.rate(checkedIn, ticketsIssued);
    const grossRevenueCents = paymentRows.reduce(
      (sum, row) => sum + Number(row.grossRevenueCents ?? 0),
      0,
    );

    return {
      event: {
        id: event.id,
        title: event.title,
        status: event.status,
        date: event.date,
        capacity: event.capacity,
        ticketPriceCents: event.ticketPriceCents,
      },
      invites: {
        total: inviteStats.total,
        redeemed: inviteStats.redeemed,
        unused: inviteStats.unused,
        expiredUnused: inviteStats.expiredUnused,
        conversionRate: inviteStats.conversionRate,
      },
      applications: {
        total: applicationsTotal,
        pending: applicationCounts.get('pending') ?? 0,
        waitlisted: applicationCounts.get('waitlisted') ?? 0,
        approved,
        rejected: applicationCounts.get('rejected') ?? 0,
        approvalRate,
      },
      payments: {
        required: event.ticketPriceCents > 0,
        pending: paymentCounts.get('pending') ?? 0,
        paid: paymentCounts.get('paid') ?? 0,
        failed: paymentCounts.get('failed') ?? 0,
        grossRevenueCents,
      },
      checkin: {
        ticketsIssued,
        checkedIn,
        attendanceRate,
      },
      funnel: {
        inviteToApplicationRate: this.rate(
          applicationsTotal,
          inviteStats.total,
        ),
        approvalRate,
        attendanceRate,
      },
    };
  }

  async getHostSummary(hostId: string): Promise<{
    events: number;
    publishedEvents: number;
    applications: number;
    approved: number;
    waitlisted: number;
    grossRevenueCents: number;
    ticketsIssued: number;
    checkedIn: number;
  }> {
    const events = await this.events.find({
      where: { hostId },
      order: { date: 'ASC' },
    });
    const analytics = await Promise.all(
      events.map((event) => this.getEvent(event.id)),
    );

    return analytics.reduce(
      (summary, item) => ({
        events: summary.events,
        publishedEvents:
          summary.publishedEvents + (item.event.status === 'published' ? 1 : 0),
        applications: summary.applications + item.applications.total,
        approved: summary.approved + item.applications.approved,
        waitlisted: summary.waitlisted + item.applications.waitlisted,
        grossRevenueCents:
          summary.grossRevenueCents + item.payments.grossRevenueCents,
        ticketsIssued: summary.ticketsIssued + item.checkin.ticketsIssued,
        checkedIn: summary.checkedIn + item.checkin.checkedIn,
      }),
      {
        events: events.length,
        publishedEvents: 0,
        applications: 0,
        approved: 0,
        waitlisted: 0,
        grossRevenueCents: 0,
        ticketsIssued: 0,
        checkedIn: 0,
      },
    );
  }

  private toCountMap(rows: StatusCount[]): Map<string, number> {
    return new Map(rows.map((row) => [row.status, Number(row.count) || 0]));
  }

  private rate(numerator: number, denominator: number): number {
    return denominator === 0 ? 0 : numerator / denominator;
  }
}
