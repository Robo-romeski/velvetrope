import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { getAuthUser, getOptionalAuthUser } from '../auth/request-user';
import { KudosService } from './kudos.service';

@Controller('kudos')
export class KudosController {
  constructor(private readonly kudos: KudosService) {}

  @Get('types')
  listTypes() {
    return this.kudos.listTypes();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async submit(
    @Req() req: Request,
    @Body()
    body: {
      recipientId?: string;
      kudoType?: string;
      message?: string | null;
      contextType?: string | null;
      contextId?: string | null;
    },
  ) {
    const { sub } = getAuthUser(req);
    const recipientId = (body.recipientId ?? '').trim();
    const kudoType = (body.kudoType ?? '').trim();
    if (!recipientId || !kudoType) {
      throw new BadRequestException('recipientId and kudoType required');
    }
    return await this.kudos.submit({
      giverId: sub,
      recipientId,
      kudoType,
      message: body.message,
      contextType: body.contextType,
      contextId: body.contextId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/pending')
  async pending(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.kudos.listPendingForRecipient(sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/given')
  async given(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.kudos.listGivenBy(sub);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('profile/:key')
  async profileKudos(@Req() req: Request, @Param('key') key: string) {
    const viewer = getOptionalAuthUser(req);
    return await this.kudos.listApprovedForProfile(key, viewer?.sub ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/approve')
  async approve(@Req() req: Request, @Param('id') id: string) {
    const { sub } = getAuthUser(req);
    return await this.kudos.approve(id, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/hide')
  async hide(@Req() req: Request, @Param('id') id: string) {
    const { sub } = getAuthUser(req);
    return await this.kudos.hide(id, sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/suppress')
  async suppress(@Param('id') id: string) {
    return await this.kudos.suppress(id);
  }
}
