import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';
import { EventsModule } from '../events/events.module';
import { GroupEntity } from './group.entity';
import { GroupMembershipEntity } from './group-membership.entity';
import { GroupPostEntity } from './group-post.entity';
import { PostCommentEntity } from './post-comment.entity';
import { PostCommentsController } from './post-comments.controller';
import { SocialController } from './social.controller';
import { MemberWallController } from './member-wall.controller';
import { SocialFeedController } from './social-feed.controller';
import { SocialService } from './social.service';
import { SocialActivityReadEntity } from './social-activity-read.entity';
import { PostAppreciationEntity } from './post-appreciation.entity';

@Module({
  imports: [
    AuthModule,
    MembersModule,
    EventsModule,
    TypeOrmModule.forFeature([
      GroupEntity,
      GroupMembershipEntity,
      GroupPostEntity,
      PostCommentEntity,
      SocialActivityReadEntity,
      PostAppreciationEntity,
    ]),
  ],
  controllers: [
    SocialController,
    SocialFeedController,
    PostCommentsController,
    MemberWallController,
  ],
  providers: [SocialService],
})
export class SocialModule {}
