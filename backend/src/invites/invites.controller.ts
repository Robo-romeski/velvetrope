import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { InvitesService } from './invites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EventsService } from '../events/events.service';
import { getAuthUser } from '../auth/request-user';

@Controller('invites')
export class InvitesController {
  constructor(
    private readonly invites: InvitesService,
    private readonly events: EventsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post('generate/:eventId')
  async generate(@Param('eventId') eventId: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    await this.events.requireHost(eventId, sub);
    return await this.invites.generate(eventId);
  }

  @Get('validate/:code')
  async validate(@Param('code') code: string) {
    return await this.invites.validate(code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('redeem/:code')
  async redeem(@Param('code') code: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.invites.redeem(code, sub);
  }
}
