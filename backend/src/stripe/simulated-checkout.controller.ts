import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getAuthUser } from '../auth/request-user';
import { SimulatedCheckoutService } from './simulated-checkout.service';

@Controller('payments/simulated-checkout')
export class SimulatedCheckoutController {
  constructor(private readonly simulated: SimulatedCheckoutService) {}

  @UseGuards(JwtAuthGuard)
  @Post('refund/:providerRef')
  async refund(@Param('providerRef') providerRef: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.simulated.refundByProviderRef(providerRef, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':sessionId')
  async getSession(@Param('sessionId') sessionId: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.simulated.getSession(sessionId, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':sessionId/complete')
  async complete(@Param('sessionId') sessionId: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.simulated.completeSession(sessionId, sub);
  }

}
