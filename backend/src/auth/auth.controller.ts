import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { getAuthUser } from './request-user';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

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

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    return await this.auth.login({
      email: body.email ?? '',
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
