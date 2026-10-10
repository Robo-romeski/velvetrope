import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getAuthUser } from '../auth/request-user';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('conversations')
  async list(@Req() req: Request) {
    return await this.messages.listConversations(getAuthUser(req).sub);
  }

  @Post('conversations')
  async create(@Req() req: Request, @Body() body: { recipientId?: string }) {
    return await this.messages.createConversation(
      getAuthUser(req).sub,
      body.recipientId ?? '',
    );
  }

  @Get('conversations/:id')
  async thread(@Req() req: Request, @Param('id') id: string) {
    return await this.messages.getConversation(id, getAuthUser(req).sub);
  }

  @Post('conversations/:id')
  async send(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { body?: string },
  ) {
    if (typeof body.body !== 'string') {
      throw new BadRequestException('Message body required');
    }
    return await this.messages.sendMessage(id, getAuthUser(req).sub, body.body);
  }

  @Patch('conversations/:id/read')
  async read(@Req() req: Request, @Param('id') id: string) {
    return await this.messages.markRead(id, getAuthUser(req).sub);
  }
}
