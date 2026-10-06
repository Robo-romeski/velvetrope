import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../auth/user.entity';
import { MemberBlockEntity } from './member-block.entity';
import { MemberFollowEntity } from './member-follow.entity';
import { MemberProfileEntity } from './member-profile.entity';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      MemberProfileEntity,
      MemberBlockEntity,
      MemberFollowEntity,
      UserEntity,
    ]),
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
