import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../auth/user.entity';
import { CheckinModule } from '../checkin/checkin.module';
import { MemberBlockEntity } from './member-block.entity';
import { MemberFollowEntity } from './member-follow.entity';
import { MemberProfileEntity } from './member-profile.entity';
import { MemberAvatarService } from './member-avatar.service';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [
    AuthModule,
    CheckinModule,
    TypeOrmModule.forFeature([
      MemberProfileEntity,
      MemberBlockEntity,
      MemberFollowEntity,
      UserEntity,
    ]),
  ],
  controllers: [MembersController],
  providers: [MembersService, MemberAvatarService],
  exports: [MembersService, MemberAvatarService],
})
export class MembersModule {}
