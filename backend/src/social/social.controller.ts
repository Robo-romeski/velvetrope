import {
  Body,
  Controller,
  Delete,
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
import type { GroupPrivacy } from './group.entity';
import { SocialService } from './social.service';

@Controller('groups')
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async list(@Req() req: Request) {
    const viewer = getOptionalAuthUser(req);
    return await this.social.listGroups(viewer?.sub ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req: Request,
    @Body()
    body: {
      name?: string;
      description?: string;
      privacy?: GroupPrivacy;
    },
  ) {
    const { sub } = getAuthUser(req);
    return await this.social.createGroup(sub, {
      name: body.name ?? '',
      description: body.description,
      privacy: body.privacy,
    });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':key')
  async getOne(@Req() req: Request, @Param('key') key: string) {
    const viewer = getOptionalAuthUser(req);
    return await this.social.getGroup(key, viewer?.sub ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':key/join')
  async join(@Req() req: Request, @Param('key') key: string) {
    const { sub } = getAuthUser(req);
    return await this.social.joinGroup(key, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':key/leave')
  async leave(@Req() req: Request, @Param('key') key: string) {
    const { sub } = getAuthUser(req);
    return await this.social.leaveGroup(key, sub);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':key/posts')
  async listPosts(@Req() req: Request, @Param('key') key: string) {
    const viewer = getOptionalAuthUser(req);
    return await this.social.listPosts(key, viewer?.sub ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':key/posts')
  async createPost(
    @Req() req: Request,
    @Param('key') key: string,
    @Body() body: { title?: string; body?: string },
  ) {
    const { sub } = getAuthUser(req);
    return await this.social.createPost(key, sub, {
      title: body.title,
      body: body.body ?? '',
    });
  }

}
