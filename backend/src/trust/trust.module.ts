import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustReportEntity } from './report.entity';
import { TrustService } from './trust.service';
import { TrustController } from './trust.controller';
import { UserEntity } from '../auth/user.entity';
import { ApplicationEntity } from '../applications/application.entity';
import { EventEntity } from '../events/event.entity';
import { CheckinTicketEntity } from '../checkin/checkin-ticket.entity';
import { EventPaymentEntity } from '../stripe/event-payment.entity';
import { StripeAccountEntity } from '../stripe/stripe-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrustReportEntity,
      UserEntity,
      ApplicationEntity,
      EventEntity,
      CheckinTicketEntity,
      EventPaymentEntity,
      StripeAccountEntity,
    ]),
  ],
  controllers: [TrustController],
  providers: [TrustService],
})
export class TrustModule {}
