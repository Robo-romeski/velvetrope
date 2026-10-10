import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { getOptionalAuthUser } from '../auth/request-user';
import { SocialService } from './social.service';

@Controller('members')
export class MemberWallController {
  constructor(private readonly social: SocialService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':key/wall')
  async wall(@Req() req: Request, @Param('key') key: string) {
    const viewer = getOptionalAuthUser(req);
    return await this.social.getMemberWall(key, viewer?.sub ?? null);
  }
}
