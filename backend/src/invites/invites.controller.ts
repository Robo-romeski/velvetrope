import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post('generate/:eventId')
  async generate(@Param('eventId') eventId: string) {
    return await this.invites.generate(eventId);
  }

  @Get('validate/:code')
  async validate(@Param('code') code: string) {
    return await this.invites.validate(code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('redeem/:code')
  async redeem(@Param('code') code: string, @Body('userSub') userSub: string) {
    return await this.invites.redeem(code, userSub);
  }
}


