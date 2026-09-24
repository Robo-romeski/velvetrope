import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { getAuthUser } from './request-user';

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
    },
  ) {
    return await this.auth.register({
      email: body.email ?? '',
      password: body.password ?? '',
      name: body.name,
      host: body.host,
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

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email?: string }) {
    return await this.auth.requestPasswordReset(body.email ?? '');
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  async resetPassword(
    @Body() body: { token?: string; password?: string },
  ) {
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
