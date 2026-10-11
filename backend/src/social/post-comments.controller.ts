import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { getAuthUser, getOptionalAuthUser } from '../auth/request-user';
import { SocialService } from './social.service';

@Controller('posts')
export class PostCommentsController {
  constructor(private readonly social: SocialService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':postId/comments')
  async listComments(@Req() req: Request, @Param('postId') postId: string) {
    const viewer = getOptionalAuthUser(req);
    return await this.social.listComments(postId, viewer?.sub ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':postId/appreciate')
  async toggleAppreciation(
    @Req() req: Request,
    @Param('postId') postId: string,
  ) {
    const { sub } = getAuthUser(req);
    return await this.social.togglePostAppreciation(postId, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':postId/comments')
  async createComment(
    @Req() req: Request,
    @Param('postId') postId: string,
    @Body() body: { body?: string },
  ) {
    const { sub } = getAuthUser(req);
    return await this.social.createComment(postId, sub, body.body ?? '');
  }
}
