import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteEntity } from './invite.entity';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InviteEntity])],
  controllers: [InvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}


