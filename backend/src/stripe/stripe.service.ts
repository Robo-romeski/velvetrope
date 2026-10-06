import { BadRequestException, Injectable } from '@nestjs/common';
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
      this.stripe = new Stripe(key);
    }
  }

  async getOnboardingLink(
    hostId: string,
    contactEmail?: string,
  ): Promise<{ url: string }> {
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
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
      return {
        url: `${baseUrl}/host/stripe/simulated-connect`,
      };
    }

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    // Remove records created by the no-key local simulation before using Stripe.
    let record = await this.accounts.findOne({ where: { hostId } });
    if (record?.accountId === `acct_${hostId}`) {
      await this.accounts.remove(record);
      record = null;
    }

    // Reuse an existing Accounts v2 merchant or create one for this host.
    if (!record) {
      if (!contactEmail) {
        throw new BadRequestException(
          'Host email is required for Stripe onboarding',
        );
      }
      const account = await this.stripe.v2.core.accounts.create(
        {
          contact_email: contactEmail,
          display_name: contactEmail,
          identity: { country: 'US' },
          configuration: {
            merchant: {
              capabilities: {
                card_payments: { requested: true },
              },
            },
          },
          defaults: {
            responsibilities: {
              fees_collector: 'stripe',
              losses_collector: 'stripe',
            },
          },
          dashboard: 'full',
          metadata: { hostId },
        },
        { idempotencyKey: `connect-account-${hostId}` },
      );
      record = this.accounts.create({ hostId, accountId: account.id });
      await this.accounts.save(record);
    }

    const link = await this.stripe.v2.core.accountLinks.create({
      account: record.accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['merchant'],
          collection_options: { fields: 'eventually_due' },
          refresh_url: `${baseUrl}/host/stripe/refresh`,
          return_url: `${baseUrl}/host/stripe/return`,
        },
      },
    });
    return { url: link.url };
  }

  async getStatus(hostId: string): Promise<{
    connected: boolean;
    accountId?: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    stripeConfigured: boolean;
  }> {
    const stripeConfigured = !!this.stripe;
    const record = await this.accounts.findOne({ where: { hostId } });
    if (!record) {
      return { connected: false, stripeConfigured };
    }
    if (!this.stripe) {
      return {
        connected: true,
        accountId: record.accountId,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        stripeConfigured: false,
      };
    }
    const acct = await this.stripe.v2.core.accounts.retrieve(record.accountId, {
      include: ['configuration.merchant', 'requirements'],
    });
    const merchant = acct.configuration?.merchant;
    const chargesEnabled =
      merchant?.capabilities?.card_payments?.status === 'active';
    const payoutsEnabled =
      merchant?.capabilities?.stripe_balance?.payouts?.status === 'active';
    const detailsSubmitted = (acct.requirements?.entries?.length ?? 0) === 0;
    return {
      connected:
        acct.applied_configurations.includes('merchant') && detailsSubmitted,
      accountId: record.accountId,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      stripeConfigured: true,
    };
  }
}
