import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckinTicketEntity } from './checkin-ticket.entity';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CheckinTicketEntity])],
  controllers: [CheckinController],
  providers: [CheckinService],
})
export class CheckinModule {}


