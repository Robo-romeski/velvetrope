import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeAccountEntity } from './stripe-account.entity';

@Injectable()
export class StripeService {
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

  async getOnboardingLink(hostId: string): Promise<{ url: string }> {
    // In tests or if no key configured, return a fake link (and fake persistence)
    if (!this.stripe) {
      const existing = await this.accounts.findOne({ where: { hostId } });
      if (!existing) {
        const created = this.accounts.create({
          hostId,
          accountId: `acct_${hostId}`,
        });
        await this.accounts.save(created);
      }
      return {
        url: `https://connect.stripe.com/setup/s/${encodeURIComponent(hostId)}`,
      };
    }

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    // Reuse existing account if present; otherwise create and persist
    let record = await this.accounts.findOne({ where: { hostId } });
    if (!record) {
      const account = await this.stripe.accounts.create({ type: 'express' });
      record = this.accounts.create({ hostId, accountId: account.id });
      await this.accounts.save(record);
    }
    const link = await this.stripe.accountLinks.create({
      account: record.accountId,
      refresh_url: `${baseUrl}/host/stripe/refresh`,
      return_url: `${baseUrl}/host/stripe/return`,
      type: 'account_onboarding',
    });
    return { url: link.url };
  }

  async getStatus(
    hostId: string,
  ): Promise<{ connected: boolean; accountId?: string }> {
    const record = await this.accounts.findOne({ where: { hostId } });
    if (!record) return { connected: false };
    if (!this.stripe) return { connected: true, accountId: record.accountId };
    const acct = await this.stripe.accounts.retrieve(record.accountId);
    return { connected: !!acct.details_submitted, accountId: record.accountId };
  }
}
