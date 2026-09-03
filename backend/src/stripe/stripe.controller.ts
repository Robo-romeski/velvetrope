import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { getAuthUser } from '../auth/request-user';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripe: StripeService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Get('onboarding')
  async onboarding(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.stripe.getOnboardingLink(sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Get('status')
  async status(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.stripe.getStatus(sub);
  }
}
