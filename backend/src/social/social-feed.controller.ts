import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getAuthUser } from '../auth/request-user';
import type { PostAudience } from './group-post.entity';
import { SocialService } from './social.service';

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialFeedController {
  constructor(private readonly social: SocialService) {}

  @Get('feed')
  async feed(
    @Req() req: Request,
    @Query('scope') scope?: 'following' | 'discover',
    @Query('cursor') cursor?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    return await this.social.listFeed(
      getAuthUser(req).sub,
      scope === 'discover' ? 'discover' : 'following',
      { cursor: cursor ?? null, limit },
    );
  }

  @Get('joined-groups')
  async joinedGroups(@Req() req: Request) {
    return await this.social.listJoinedGroups(getAuthUser(req).sub);
  }

  @Post('posts')
  async createPost(
    @Req() req: Request,
    @Body()
    body: {
      body?: string;
      linkUrl?: string | null;
      audience?: PostAudience;
      eventId?: string | null;
    },
  ) {
    return await this.social.createMemberPost(getAuthUser(req).sub, body);
  }

  @Get('linkable-events')
  async linkableEvents(@Req() req: Request) {
    return await this.social.listLinkableEvents(getAuthUser(req).sub);
  }

  @Get('discovery')
  async discovery(@Req() req: Request, @Query('q') query?: string) {
    return await this.social.discover(getAuthUser(req).sub, query ?? '');
  }

  @Get('notifications')
  async notifications(@Req() req: Request) {
    return await this.social.listNotifications(getAuthUser(req).sub);
  }

  @Patch('notifications/read')
  async markNotificationsRead(@Req() req: Request) {
    return await this.social.markNotificationsRead(getAuthUser(req).sub);
  }
}
