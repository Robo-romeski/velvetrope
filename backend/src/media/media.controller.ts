import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MemberAvatarService } from '../members/member-avatar.service';

@Controller('media')
export class MediaController {
  constructor(private readonly avatars: MemberAvatarService) {}

  @Get('avatars/:userId')
  async avatar(@Param('userId') userId: string, @Res() res: Response) {
    const { stream, contentType } = await this.avatars.streamAvatar(userId);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    stream.pipe(res);
  }
}
