import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PersonaService } from './persona.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getAuthUser } from '../auth/request-user';

@Controller('identity')
export class IdentityController {
  constructor(private readonly persona: PersonaService) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async status(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.persona.status(sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('session')
  async session(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.persona.createSession(sub);
  }

  @Post('persona/webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: Request,
    @Headers('persona-signature') signature?: string,
  ) {
    if (!Buffer.isBuffer(req.body)) {
      throw new BadRequestException('Persona webhook raw body required');
    }
    return await this.persona.processWebhook(req.body, signature);
  }
}
