import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { StripeWebhookController } from './webhook.controller';
import { StripeAccountEntity } from './stripe-account.entity';
import { EventPaymentEntity } from './event-payment.entity';
import { EventEntity } from '../events/event.entity';
import { StripePaymentsService } from './stripe-payments.service';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StripeAccountEntity,
      EventPaymentEntity,
      EventEntity,
    ]),
    ApplicationsModule,
  ],
  controllers: [StripeController, StripeWebhookController],
  providers: [StripeService, StripePaymentsService],
  exports: [StripePaymentsService],
})
export class StripeModule {}
