import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { getAuthUser } from './request-user';
import { getClientIp } from '../common/client-ip';

@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body()
    body: {
      email?: string;
      password?: string;
      name?: string;
      host?: boolean;
      confirmedAdult?: boolean;
      acceptedTermsVersion?: string;
    },
  ) {
    return await this.auth.register({
      email: body.email ?? '',
      password: body.password ?? '',
      name: body.name,
      host: body.host,
      confirmedAdult: body.confirmedAdult,
      acceptedTermsVersion: body.acceptedTermsVersion,
    });
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    return await this.auth.login({
      email: body.email ?? '',
      password: body.password ?? '',
    });
  }

  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Post('forgot-password')
  async forgotPassword(@Req() req: Request, @Body() body: { email?: string }) {
    return await this.auth.requestPasswordReset(body.email ?? '', {
      clientIp: getClientIp(req),
    });
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  async resetPassword(@Body() body: { token?: string; password?: string }) {
    return await this.auth.resetPassword({
      token: body.token ?? '',
      password: body.password ?? '',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.auth.getById(sub);
  }
}
