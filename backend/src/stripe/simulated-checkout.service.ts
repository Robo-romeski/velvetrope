import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventPaymentEntity } from './event-payment.entity';
import { EventEntity } from '../events/event.entity';
import { EducationalContentEntity } from '../education/educational-content.entity';
import { CommerceService } from '../commerce/commerce.service';
import { StripePaymentsService } from './stripe-payments.service';

export type SimulatedCheckoutSession = {
  simulated: true;
  sessionId: string;
  kind: 'event_ticket' | 'course_access';
  title: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  eventId?: string;
  courseSlug?: string;
  status: 'pending' | 'paid';
};

@Injectable()
export class SimulatedCheckoutService {
  constructor(
    private readonly payments: StripePaymentsService,
    private readonly commerce: CommerceService,
    @InjectRepository(EventPaymentEntity)
    private readonly eventPayments: Repository<EventPaymentEntity>,
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
    @InjectRepository(EducationalContentEntity)
    private readonly courses: Repository<EducationalContentEntity>,
  ) {}

  assertSimulationMode(): void {
    if (this.payments.isLiveStripeEnabled()) {
      throw new ForbiddenException('Simulated checkout is not active');
    }
  }

  async getSession(
    sessionId: string,
    userSub: string,
  ): Promise<SimulatedCheckoutSession> {
    this.assertSimulationMode();
    const trimmed = sessionId.trim();
    if (!trimmed) {
      throw new NotFoundException('Checkout session not found');
    }

    const eventPayment = await this.eventPayments.findOne({
      where: { stripeCheckoutSessionId: trimmed },
    });
    if (eventPayment) {
      if (eventPayment.userSub !== userSub) {
        throw new ForbiddenException('Checkout session does not match buyer');
      }
      const event = await this.events.findOne({
        where: { id: eventPayment.eventId },
      });
      if (!event) {
        throw new NotFoundException('Event not found');
      }
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
      return {
        simulated: true,
        sessionId: trimmed,
        kind: 'event_ticket',
        title: event.title,
        amountCents: eventPayment.amountCents,
        currency: 'usd',
        successUrl: `${baseUrl}/events/${encodeURIComponent(event.id)}/ticket?paid=1&session_id=${encodeURIComponent(trimmed)}`,
        cancelUrl: `${baseUrl}/events/${encodeURIComponent(event.id)}/ticket`,
        eventId: event.id,
        status: eventPayment.status === 'paid' ? 'paid' : 'pending',
      };
    }

    const order = await this.commerce.findByProviderRef(trimmed);
    if (!order) {
      throw new NotFoundException('Checkout session not found');
    }
    if (order.buyerId !== userSub) {
      throw new ForbiddenException('Checkout session does not match buyer');
    }
    const lines = await this.commerce.getLinesForOrder(order.id);
    const courseLine = lines.find((l) => l.productType === 'course_access');
    if (!courseLine) {
      throw new NotFoundException('Checkout session not found');
    }
    const content = await this.courses.findOne({
      where: { id: courseLine.productId },
    });
    if (!content) {
      throw new NotFoundException('Content not found');
    }
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    return {
      simulated: true,
      sessionId: trimmed,
      kind: 'course_access',
      title: content.title,
      amountCents: order.totalCents,
      currency: order.currency ?? 'usd',
      successUrl: `${baseUrl}/learn/${encodeURIComponent(content.slug)}?paid=1&session_id=${encodeURIComponent(trimmed)}`,
      cancelUrl: `${baseUrl}/learn/${encodeURIComponent(content.slug)}`,
      courseSlug: content.slug,
      status: order.status === 'paid' ? 'paid' : 'pending',
    };
  }

  async completeSession(
    sessionId: string,
    userSub: string,
  ): Promise<{ successUrl: string }> {
    const session = await this.getSession(sessionId, userSub);
    if (session.status === 'paid') {
      return { successUrl: session.successUrl };
    }
    if (session.kind === 'event_ticket' && session.eventId) {
      await this.payments.confirmCheckoutSession(
        session.eventId,
        userSub,
        session.sessionId,
      );
    } else if (session.kind === 'course_access' && session.courseSlug) {
      await this.payments.confirmCourseCheckoutSession(
        session.courseSlug,
        userSub,
        session.sessionId,
      );
    }
    return { successUrl: session.successUrl };
  }

  async refundByProviderRef(providerRef: string, userSub: string) {
    this.assertSimulationMode();
    const trimmed = providerRef.trim();
    const order = await this.commerce.findByProviderRef(trimmed);
    if (order && order.buyerId !== userSub) {
      throw new ForbiddenException('Refund not allowed for this order');
    }
    const eventPayment = await this.eventPayments.findOne({
      where: { stripeCheckoutSessionId: trimmed },
    });
    if (eventPayment && eventPayment.userSub !== userSub) {
      throw new ForbiddenException('Refund not allowed for this payment');
    }
    return await this.commerce.refundByProviderRef(trimmed, 'simulated_refund');
  }
}
