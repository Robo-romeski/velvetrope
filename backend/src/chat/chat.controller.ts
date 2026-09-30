import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getAuthUser } from '../auth/request-user';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('event/:eventId')
  async list(
    @Param('eventId') eventId: string,
    @Req() req: Request,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    const { sub } = getAuthUser(req);
    return await this.chat.list(eventId, sub, {
      before,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 10_000 } })
  @Post('event/:eventId')
  async create(
    @Param('eventId') eventId: string,
    @Req() req: Request,
    @Body() body: { body?: string },
  ) {
    const { sub } = getAuthUser(req);
    return await this.chat.create(eventId, sub, body.body ?? '');
  }

  @Delete('messages/:id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.chat.delete(id, sub);
  }
}
