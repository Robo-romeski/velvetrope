import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckinTicketEntity } from './checkin-ticket.entity';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';
import { EventsModule } from '../events/events.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckinTicketEntity]),
    EventsModule,
    ApplicationsModule,
  ],
  controllers: [CheckinController],
  providers: [CheckinService],
})
export class CheckinModule {}
