import { Controller, Get } from '@nestjs/common';

@Controller('healthz')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'ok' };
  }

  /** Safe for ops: booleans only, no secret values. */
  @Get('integrations')
  getIntegrations() {
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
    const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    return {
      database: !!process.env.DATABASE_URL?.trim(),
      stripe: {
        secretKey: !!stripeKey,
        webhookSecret: !!webhook,
        liveMode: stripeKey?.startsWith('sk_live_') ?? false,
      },
      email: {
        resend: !!process.env.RESEND_API_KEY?.trim(),
        fromConfigured: !!process.env.EMAIL_FROM?.trim(),
      },
      s3: {
        bucket: !!process.env.S3_PHOTO_BUCKET?.trim(),
        region: process.env.S3_REGION?.trim() || null,
      },
    };
  }
}
