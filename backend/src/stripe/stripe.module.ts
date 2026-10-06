import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { SimulatedCheckoutController } from './simulated-checkout.controller';
import { SimulatedCheckoutService } from './simulated-checkout.service';
import { StripeWebhookController } from './webhook.controller';
import { StripeAccountEntity } from './stripe-account.entity';
import { EventPaymentEntity } from './event-payment.entity';
import { EventEntity } from '../events/event.entity';
import { StripePaymentsService } from './stripe-payments.service';
import { ApplicationsModule } from '../applications/applications.module';
import { CommerceModule } from '../commerce/commerce.module';
import { EducationalContentEntity } from '../education/educational-content.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StripeAccountEntity,
      EventPaymentEntity,
      EventEntity,
      EducationalContentEntity,
    ]),
    ApplicationsModule,
    CommerceModule,
  ],
  controllers: [
    StripeController,
    SimulatedCheckoutController,
    StripeWebhookController,
  ],
  providers: [StripeService, StripePaymentsService, SimulatedCheckoutService],
  exports: [StripePaymentsService],
})
export class StripeModule {}
