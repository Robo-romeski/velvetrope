import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeAccountEntity } from './stripe-account.entity';

@Controller('stripe')
export class StripeWebhookController {
  private stripe: Stripe | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(StripeAccountEntity)
    private readonly accounts: Repository<StripeAccountEntity>,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key && process.env.NODE_ENV !== 'test') {
      this.stripe = new Stripe(key, { apiVersion: '2024-06-20' } as any);
    }
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: Request, @Headers('stripe-signature') signature?: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    const rawBody = (req as any).body as Buffer; // express.raw set in main.ts

    let event: Stripe.Event | null = null;
    if (this.stripe && webhookSecret && rawBody && signature) {
      try {
        event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err) {
        return { ok: false };
      }
    }

    // Handle minimal set of events
    const type = event?.type;
    if (type === 'account.updated') {
      const account = event?.data?.object as Stripe.Account;
      // If we track accounts, we could update metadata; for now nothing required
    }

    return { ok: true };
  }
}


