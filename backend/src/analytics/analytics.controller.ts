import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { getAuthUser } from '../auth/request-user';
import { EventsService } from '../events/events.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('host')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly events: EventsService,
  ) {}

  @Get('event/:eventId')
  async event(@Param('eventId') eventId: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    await this.events.requireHost(eventId, sub);
    return await this.analytics.getEvent(eventId);
  }

  @Get('host/summary')
  async hostSummary(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.analytics.getHostSummary(sub);
  }
}
