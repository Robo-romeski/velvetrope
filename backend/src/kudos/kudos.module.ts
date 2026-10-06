import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../auth/user.entity';
import { CheckinTicketEntity } from '../checkin/checkin-ticket.entity';
import { CommerceModule } from '../commerce/commerce.module';
import { MembersModule } from '../members/members.module';
import { GroupMembershipEntity } from '../social/group-membership.entity';
import { KudosController } from './kudos.controller';
import { KudosService } from './kudos.service';
import { MemberKudoEntity } from './member-kudo.entity';

@Module({
  imports: [
    AuthModule,
    MembersModule,
    CommerceModule,
    TypeOrmModule.forFeature([
      MemberKudoEntity,
      UserEntity,
      CheckinTicketEntity,
      GroupMembershipEntity,
    ]),
  ],
  controllers: [KudosController],
  providers: [KudosService],
  exports: [KudosService],
})
export class KudosModule {}
