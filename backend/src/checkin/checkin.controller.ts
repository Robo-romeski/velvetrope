import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('checkin')
export class CheckinController {
  constructor(private readonly svc: CheckinService) {}

  // Host issues ticket for a user
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post('issue/:eventId')
  async issue(@Param('eventId') eventId: string, @Body('userSub') userSub: string) {
    return await this.svc.issue(eventId, userSub);
  }

  // Scanner verifies token and marks used
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post('verify/:token')
  async verify(@Param('token') token: string) {
    return await this.svc.verifyAndUse(token);
  }
}


