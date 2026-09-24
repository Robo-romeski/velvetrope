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

@Injectable()
export class StripePaymentsService {
  private stripe: Stripe | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(EventPaymentEntity)
    private readonly payments: Repository<EventPaymentEntity>,
    @InjectRepository(StripeAccountEntity)
    private readonly accounts: Repository<StripeAccountEntity>,
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key && process.env.NODE_ENV !== 'test') {
      this.stripe = new Stripe(key, { apiVersion: '2024-06-20' } as any);
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
      return { required: true, status: 'paid', amountCents: record.amountCents };
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
      return { url: null, sessionId };
    }

    const session = await this.stripe.checkout.sessions.create({
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
      payment_intent_data: {
        transfer_data: { destination: hostAccount.accountId },
      },
      success_url: `${baseUrl}/events/${encodeURIComponent(eventId)}/ticket?paid=1`,
      cancel_url: `${baseUrl}/events/${encodeURIComponent(eventId)}/ticket`,
      metadata: { eventId, userSub },
    });

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
      return record;
    }

    record.status = 'paid';
    record.paidAt = new Date();
    record.stripeCheckoutSessionId =
      record.stripeCheckoutSessionId ?? input.sessionId;
    if (input.paymentIntentId) {
      record.stripePaymentIntentId = input.paymentIntentId;
    }
    return await this.payments.save(record);
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

  async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
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
          : session.payment_intent?.id ?? null,
    });
  }
}
