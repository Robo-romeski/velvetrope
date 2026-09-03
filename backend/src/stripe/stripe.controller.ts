import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripe: StripeService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Get('onboarding/:hostId')
  async onboarding(@Param('hostId') hostId: string) {
    return await this.stripe.getOnboardingLink(hostId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Get('status/:hostId')
  async status(@Param('hostId') hostId: string) {
    return await this.stripe.getStatus(hostId);
  }
}


