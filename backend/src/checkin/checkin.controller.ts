import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CheckinService } from './checkin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EventsService } from '../events/events.service';
import { ApplicationsService } from '../applications/applications.service';
import { getAuthUser } from '../auth/request-user';

@Controller('checkin')
export class CheckinController {
  constructor(
    private readonly svc: CheckinService,
    private readonly events: EventsService,
    private readonly apps: ApplicationsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post('issue/:eventId')
  async issue(
    @Param('eventId') eventId: string,
    @Req() req: Request,
    @Body('userSub') userSub: string,
  ) {
    const { sub } = getAuthUser(req);
    await this.events.requireHost(eventId, sub);
    if (!userSub) throw new BadRequestException('userSub required');
    return await this.svc.issue(eventId, userSub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mine/:eventId')
  async mine(@Param('eventId') eventId: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    const approved = await this.apps.findApproved(eventId, sub);
    if (!approved)
      throw new ForbiddenException('No approved application for this event');
    return await this.svc.issue(eventId, sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post('verify/:token')
  async verify(@Param('token') token: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    const ticket = await this.svc.getByToken(token);
    await this.events.requireHost(ticket.eventId, sub);
    return await this.svc.verifyAndUse(token);
  }
}
