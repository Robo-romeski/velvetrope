import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationEntity } from './application.entity';
import { ApplicationFormEntity } from './application-form.entity';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { InvitesModule } from '../invites/invites.module';

@Module({
  imports: [TypeOrmModule.forFeature([ApplicationEntity, ApplicationFormEntity]), InvitesModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}


