import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { EventPaymentEntity } from './event-payment.entity';
import { StripeAccountEntity } from './stripe-account.entity';
import { EventEntity } from '../events/event.entity';
import { randomBytes } from 'crypto';
import { CommerceService } from '../commerce/commerce.service';
import { EducationalContentEntity } from '../education/educational-content.entity';

@Injectable()
export class StripePaymentsService {
  private stripe: Stripe | null = null;

  isLiveStripeEnabled(): boolean {
    return this.stripe !== null;
  }

  simulatedCheckoutPageUrl(sessionId: string): string {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/checkout/simulate?session_id=${encodeURIComponent(sessionId)}`;
  }

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(EventPaymentEntity)
    private readonly payments: Repository<EventPaymentEntity>,
    @InjectRepository(StripeAccountEntity)
    private readonly accounts: Repository<StripeAccountEntity>,
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
    @InjectRepository(EducationalContentEntity)
    private readonly courses: Repository<EducationalContentEntity>,
    private readonly commerce: CommerceService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key && process.env.NODE_ENV !== 'test') {
      this.stripe = new Stripe(key);
    }
  }

  async getPaymentStatus(
    eventId: string,
    userSub: string,
  ): Promise<{
    required: boolean;
    status: 'not_required' | 'pending' | 'paid' | 'failed';
    amountCents: number;
  }> {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    const amountCents = Math.max(0, event.ticketPriceCents ?? 0);
    if (amountCents === 0) {
      return { required: false, status: 'not_required', amountCents: 0 };
    }

    const record = await this.payments.findOne({
      where: { eventId, userSub },
    });
    if (!record) {
      return { required: true, status: 'pending', amountCents };
    }
    if (record.status === 'paid') {
      return {
        required: true,
        status: 'paid',
        amountCents: record.amountCents,
      };
    }
    return {
      required: true,
      status: record.status === 'failed' ? 'failed' : 'pending',
      amountCents: record.amountCents,
    };
  }

  async assertPaidIfRequired(eventId: string, userSub: string): Promise<void> {
    const status = await this.getPaymentStatus(eventId, userSub);
    if (status.required && status.status !== 'paid') {
      throw new ForbiddenException('Ticket payment required before check-in');
    }
  }

  async createCheckoutSession(
    eventId: string,
    userSub: string,
  ): Promise<{ url: string | null; sessionId: string }> {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== 'published') {
      throw new BadRequestException('Event is not open for ticket purchase');
    }

    const amountCents = Math.max(0, event.ticketPriceCents ?? 0);
    if (amountCents === 0) {
      throw new BadRequestException('This event does not require payment');
    }

    const existing = await this.payments.findOne({
      where: { eventId, userSub },
    });
    if (existing?.status === 'paid') {
      throw new BadRequestException('Ticket already paid');
    }

    const hostAccount = await this.accounts.findOne({
      where: { hostId: event.hostId },
    });
    if (!hostAccount) {
      throw new BadRequestException(
        'Host has not connected Stripe for payouts',
      );
    }

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

    if (!this.stripe) {
      const sessionId = `cs_test_${randomBytes(16).toString('hex')}`;
      const record =
        existing ??
        this.payments.create({
          eventId,
          userSub,
          amountCents,
          status: 'pending',
          stripeCheckoutSessionId: sessionId,
        });
      record.amountCents = amountCents;
      record.status = 'pending';
      record.stripeCheckoutSessionId = sessionId;
      await this.payments.save(record);
      return { url: this.simulatedCheckoutPageUrl(sessionId), sessionId };
    }

    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: amountCents,
              product_data: { name: event.title },
            },
          },
        ],
        success_url: `${baseUrl}/events/${encodeURIComponent(eventId)}/ticket?paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/events/${encodeURIComponent(eventId)}/ticket`,
        metadata: {
          eventId,
          userSub,
          orderKind: 'event_ticket',
        },
      },
      { stripeAccount: hostAccount.accountId },
    );

    const record =
      existing ??
      this.payments.create({
        eventId,
        userSub,
        amountCents,
        status: 'pending',
      });
    record.amountCents = amountCents;
    record.status = 'pending';
    record.stripeCheckoutSessionId = session.id;
    await this.payments.save(record);

    return { url: session.url ?? null, sessionId: session.id };
  }

  async confirmCheckoutSession(
    eventId: string,
    userSub: string,
    sessionId: string,
  ): Promise<EventPaymentEntity> {
    const record = await this.payments.findOne({
      where: { stripeCheckoutSessionId: sessionId },
    });
    if (!record || record.eventId !== eventId || record.userSub !== userSub) {
      throw new ForbiddenException('Checkout session does not match attendee');
    }
    if (record.status === 'paid') {
      return record;
    }

    if (!this.stripe) {
      return await this.fulfillCheckoutBySessionId(sessionId);
    }

    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    const hostAccount = await this.accounts.findOne({
      where: { hostId: event.hostId },
    });
    if (!hostAccount) {
      throw new BadRequestException(
        'Host has not connected Stripe for payouts',
      );
    }

    const session = await this.stripe.checkout.sessions.retrieve(
      sessionId,
      { expand: ['payment_intent'] },
      { stripeAccount: hostAccount.accountId },
    );
    if (session.status !== 'complete' || session.payment_status !== 'paid') {
      throw new BadRequestException('Checkout session is not paid');
    }
    if (
      session.metadata?.eventId !== eventId ||
      session.metadata?.userSub !== userSub
    ) {
      throw new ForbiddenException('Checkout session metadata mismatch');
    }
    if (
      session.amount_total !== record.amountCents ||
      session.currency !== 'usd'
    ) {
      throw new BadRequestException('Checkout session amount mismatch');
    }

    return await this.fulfillCheckoutSession({
      sessionId,
      eventId,
      userSub,
      paymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
    });
  }

  async fulfillCheckoutSession(input: {
    sessionId: string;
    eventId: string;
    userSub: string;
    paymentIntentId?: string | null;
  }): Promise<EventPaymentEntity> {
    let record = await this.payments.findOne({
      where: { stripeCheckoutSessionId: input.sessionId },
    });
    if (!record) {
      record = await this.payments.findOne({
        where: { eventId: input.eventId, userSub: input.userSub },
      });
    }
    if (!record) {
      record = this.payments.create({
        eventId: input.eventId,
        userSub: input.userSub,
        amountCents: 0,
        status: 'pending',
        stripeCheckoutSessionId: input.sessionId,
      });
    }

    if (record.status === 'paid') {
      await this.commerce.recordInstantPaidOrder({
        buyerId: input.userSub,
        provider: 'stripe',
        providerRef: input.sessionId,
        totalCents: record.amountCents,
        lines: [
          {
            productType: 'event_ticket',
            productId: input.eventId,
            amountCents: record.amountCents,
          },
        ],
      });
      return record;
    }

    record.status = 'paid';
    record.paidAt = new Date();
    record.stripeCheckoutSessionId =
      record.stripeCheckoutSessionId ?? input.sessionId;
    if (input.paymentIntentId) {
      record.stripePaymentIntentId = input.paymentIntentId;
    }
    const saved = await this.payments.save(record);
    await this.commerce.recordInstantPaidOrder({
      buyerId: input.userSub,
      provider: 'stripe',
      providerRef: input.sessionId,
      totalCents: saved.amountCents,
      lines: [
        {
          productType: 'event_ticket',
          productId: input.eventId,
          amountCents: saved.amountCents,
        },
      ],
    });
    return saved;
  }

  async fulfillAnyCheckoutSession(sessionId: string): Promise<void> {
    const order = await this.commerce.findByProviderRef(sessionId);
    if (order) {
      await this.commerce.fulfillPaidOrder(sessionId);
      return;
    }
    await this.fulfillCheckoutBySessionId(sessionId);
  }

  async fulfillCheckoutBySessionId(
    sessionId: string,
  ): Promise<EventPaymentEntity> {
    const record = await this.payments.findOne({
      where: { stripeCheckoutSessionId: sessionId },
    });
    if (!record) {
      throw new NotFoundException('Unknown checkout session');
    }
    return await this.fulfillCheckoutSession({
      sessionId,
      eventId: record.eventId,
      userSub: record.userSub,
    });
  }

  async getCourseAccessStatus(contentId: string, userSub: string) {
    const content = await this.courses.findOne({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Content not found');
    const priceCents = Math.max(0, content.priceCents ?? 0);
    if (priceCents === 0) {
      return {
        required: false,
        status: 'not_required' as const,
        priceCents: 0,
      };
    }
    const entitled = await this.commerce.hasActiveEntitlement(
      userSub,
      'course_access',
      contentId,
    );
    return {
      required: true,
      priceCents,
      status: entitled ? ('paid' as const) : ('pending' as const),
    };
  }

  async createCourseCheckoutSession(
    contentSlug: string,
    userSub: string,
  ): Promise<{ url: string | null; sessionId: string }> {
    const content = await this.courses.findOne({
      where: { slug: contentSlug },
    });
    if (!content || content.status !== 'published') {
      throw new NotFoundException('Content not found');
    }
    const amountCents = Math.max(0, content.priceCents ?? 0);
    if (amountCents === 0) {
      throw new BadRequestException('This content is free');
    }
    if (content.creatorId === userSub) {
      throw new BadRequestException('Creators already have access');
    }
    const entitled = await this.commerce.hasActiveEntitlement(
      userSub,
      'course_access',
      content.id,
    );
    if (entitled) {
      throw new BadRequestException('Already purchased');
    }

    const creatorAccount = await this.accounts.findOne({
      where: { hostId: content.creatorId },
    });
    if (!creatorAccount) {
      throw new BadRequestException(
        'Educator has not connected payouts for paid content',
      );
    }

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

    if (!this.stripe) {
      const sessionId = `cs_test_${randomBytes(16).toString('hex')}`;
      await this.commerce.createPendingOrder({
        buyerId: userSub,
        provider: 'stripe',
        providerRef: sessionId,
        totalCents: amountCents,
        lines: [
          {
            productType: 'course_access',
            productId: content.id,
            amountCents,
            payeeId: content.creatorId,
          },
        ],
      });
      return { url: this.simulatedCheckoutPageUrl(sessionId), sessionId };
    }

    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: amountCents,
              product_data: { name: content.title },
            },
          },
        ],
        success_url: `${baseUrl}/learn/${encodeURIComponent(content.slug)}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/learn/${encodeURIComponent(content.slug)}`,
        metadata: {
          orderKind: 'course_access',
          contentId: content.id,
          userSub,
        },
      },
      { stripeAccount: creatorAccount.accountId },
    );

    await this.commerce.createPendingOrder({
      buyerId: userSub,
      provider: 'stripe',
      providerRef: session.id,
      totalCents: amountCents,
      lines: [
        {
          productType: 'course_access',
          productId: content.id,
          amountCents,
          payeeId: content.creatorId,
        },
      ],
    });

    return { url: session.url ?? null, sessionId: session.id };
  }

  async confirmCourseCheckoutSession(
    contentSlug: string,
    userSub: string,
    sessionId: string,
  ): Promise<void> {
    const content = await this.courses.findOne({
      where: { slug: contentSlug },
    });
    if (!content) throw new NotFoundException('Content not found');

    if (!this.stripe) {
      await this.commerce.fulfillPaidOrder(sessionId);
      return;
    }

    const creatorAccount = await this.accounts.findOne({
      where: { hostId: content.creatorId },
    });
    if (!creatorAccount) {
      throw new BadRequestException('Educator payout account not connected');
    }

    const session = await this.stripe.checkout.sessions.retrieve(
      sessionId,
      { expand: ['payment_intent'] },
      { stripeAccount: creatorAccount.accountId },
    );
    if (session.status !== 'complete' || session.payment_status !== 'paid') {
      throw new BadRequestException('Checkout session is not paid');
    }
    if (
      session.metadata?.orderKind !== 'course_access' ||
      session.metadata?.contentId !== content.id ||
      session.metadata?.userSub !== userSub
    ) {
      throw new ForbiddenException('Checkout session metadata mismatch');
    }
    await this.commerce.fulfillPaidOrder(sessionId);
  }

  async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const orderKind = session.metadata?.orderKind ?? 'event_ticket';
    if (orderKind === 'course_access') {
      if (session.id) {
        await this.commerce.fulfillPaidOrder(session.id);
      }
      return;
    }

    const eventId = session.metadata?.eventId;
    const userSub = session.metadata?.userSub;
    if (!eventId || !userSub || !session.id) return;

    await this.fulfillCheckoutSession({
      sessionId: session.id,
      eventId,
      userSub,
      paymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
    });
  }
}
