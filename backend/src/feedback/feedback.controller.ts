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
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { getAuthUser } from '../auth/request-user';
import { EventsService } from '../events/events.service';

@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly feedback: FeedbackService,
    private readonly events: EventsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('event/:eventId')
  async submit(
    @Param('eventId') eventId: string,
    @Req() req: Request,
    @Body()
    body: {
      rating?: number;
      comment?: string;
      anonymous?: boolean;
    },
  ) {
    const { sub } = getAuthUser(req);
    return await this.feedback.submit({
      eventId,
      userSub: sub,
      rating: Number(body.rating),
      comment: body.comment,
      anonymous: body.anonymous,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine/:eventId')
  async mine(@Param('eventId') eventId: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.feedback.getMine(eventId, sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Get('event/:eventId')
  async forHost(@Param('eventId') eventId: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    await this.events.requireHost(eventId, sub);
    return await this.feedback.getForHost(eventId);
  }
}
