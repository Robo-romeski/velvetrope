import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ApplicationEntity } from '../applications/application.entity';
import { CheckinTicketEntity } from '../checkin/checkin-ticket.entity';
import { EventEntity } from '../events/event.entity';
import { EventsModule } from '../events/events.module';
import { InvitesModule } from '../invites/invites.module';
import { EventPaymentEntity } from '../stripe/event-payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventEntity,
      ApplicationEntity,
      EventPaymentEntity,
      CheckinTicketEntity,
    ]),
    EventsModule,
    InvitesModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
