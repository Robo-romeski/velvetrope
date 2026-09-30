import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckinTicketEntity } from './checkin-ticket.entity';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';
import { EventsModule } from '../events/events.module';
import { ApplicationsModule } from '../applications/applications.module';
import { StripeModule } from '../stripe/stripe.module';
import { CheckinPhotoEntity } from './checkin-photo.entity';
import { PhotoCheckinService } from './photo-checkin.service';
import { PhotoStorageService } from './photo-storage.service';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckinTicketEntity, CheckinPhotoEntity]),
    EventsModule,
    ApplicationsModule,
    StripeModule,
    IdentityModule,
  ],
  controllers: [CheckinController],
  providers: [CheckinService, PhotoCheckinService, PhotoStorageService],
  exports: [PhotoCheckinService, PhotoStorageService],
})
export class CheckinModule {}
