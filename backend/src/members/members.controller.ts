import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { getAuthUser, getOptionalAuthUser } from '../auth/request-user';
import { MemberAvatarService } from './member-avatar.service';
import { MembersService } from './members.service';
import type { ProfileVisibility } from './profile-visibility';
import type { MessagePermission, ProfileLink } from './member-profile.entity';

@Controller('members')
export class MembersController {
  constructor(
    private readonly members: MembersService,
    private readonly avatars: MemberAvatarService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  async ownProfile(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.members.getOwnProfile(sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar/upload-request')
  async avatarUploadRequest(
    @Req() req: Request,
    @Body() body: { contentType?: string; sizeBytes?: number },
  ) {
    const { sub } = getAuthUser(req);
    return await this.avatars.createUploadRequest(
      sub,
      body.contentType ?? '',
      Number(body.sizeBytes),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar/complete')
  async avatarUploadComplete(
    @Req() req: Request,
    @Body() body: { contentType?: string; sizeBytes?: number },
  ) {
    const { sub } = getAuthUser(req);
    const contentType = body.contentType ?? '';
    const sizeBytes = Number(body.sizeBytes);
    if (!contentType || !Number.isFinite(sizeBytes)) {
      throw new BadRequestException('contentType and sizeBytes required');
    }
    return await this.avatars.completeS3Upload(sub, contentType, sizeBytes);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar/file')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async avatarDirectUpload(
    @Req() req: Request,
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
  ) {
    const { sub } = getAuthUser(req);
    return await this.avatars.saveDirectUpload(sub, file);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  async updateProfile(
    @Req() req: Request,
    @Body()
    body: {
      displayName?: string | null;
      bio?: string | null;
      interests?: string[];
      links?: ProfileLink[];
      avatarUrl?: string | null;
      visibility?: Partial<ProfileVisibility>;
      messagePermission?: MessagePermission;
    },
  ) {
    const { sub } = getAuthUser(req);
    return await this.members.updateOwnProfile(sub, body);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':key/profile')
  async publicProfile(@Req() req: Request, @Param('key') key: string) {
    const viewer = getOptionalAuthUser(req);
    return await this.members.getPublicProfile(key, viewer?.sub ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/blocks')
  async listBlocks(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.members.listBlocks(sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/followers')
  async listFollowers(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.members.listFollowers(sub, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/following')
  async listFollowing(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.members.listFollowing(sub, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':userId/block')
  async block(@Req() req: Request, @Param('userId') userId: string) {
    const { sub } = getAuthUser(req);
    return await this.members.blockUser(sub, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':userId/block')
  async unblock(@Req() req: Request, @Param('userId') userId: string) {
    const { sub } = getAuthUser(req);
    return await this.members.unblockUser(sub, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':userId/follow')
  async follow(@Req() req: Request, @Param('userId') userId: string) {
    const { sub } = getAuthUser(req);
    return await this.members.follow(sub, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':userId/follow')
  async unfollow(@Req() req: Request, @Param('userId') userId: string) {
    const { sub } = getAuthUser(req);
    return await this.members.unfollow(sub, userId);
  }
}
