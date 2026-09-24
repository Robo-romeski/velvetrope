import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from './stripe.service';
import { StripePaymentsService } from './stripe-payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { getAuthUser } from '../auth/request-user';
import { ApplicationsService } from '../applications/applications.service';

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripe: StripeService,
    private readonly payments: StripePaymentsService,
    private readonly applications: ApplicationsService,
  ) {}

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

  @UseGuards(JwtAuthGuard)
  @Get('payment/:eventId')
  async paymentStatus(@Param('eventId') eventId: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.payments.getPaymentStatus(eventId, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout/:eventId')
  async checkout(@Param('eventId') eventId: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    const approved = await this.applications.findApproved(eventId, sub);
    if (!approved) {
      throw new ForbiddenException('No approved application for this event');
    }
    return await this.payments.createCheckoutSession(eventId, sub);
  }

  /** Test-only: simulate Stripe checkout completion without dashboard keys. */
  @Post('test/fulfill-checkout')
  async testFulfillCheckout(@Body() body: { sessionId?: string }) {
    if (process.env.NODE_ENV !== 'test') {
      throw new ForbiddenException();
    }
    const sessionId = (body?.sessionId ?? '').trim();
    if (!sessionId) {
      throw new ForbiddenException('sessionId required');
    }
    await this.payments.fulfillCheckoutBySessionId(sessionId);
    return { ok: true };
  }
}
