import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { StripeWebhookController } from './webhook.controller';
import { StripeAccountEntity } from './stripe-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StripeAccountEntity])],
  controllers: [StripeController, StripeWebhookController],
  providers: [StripeService],
})
export class StripeModule {}


