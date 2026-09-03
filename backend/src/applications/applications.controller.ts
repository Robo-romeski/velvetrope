import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EventsService } from '../events/events.service';
import { getAuthUser } from '../auth/request-user';

interface SubmitDto {
  eventId: string;
  answers?: unknown;
  inviteCode?: string;
}

interface DecisionDto {
  status: 'approved' | 'rejected';
  reason?: string;
}

@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly apps: ApplicationsService,
    private readonly events: EventsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async submit(@Req() req: Request, @Body() dto: SubmitDto) {
    const { sub } = getAuthUser(req);
    return await this.apps.submit({ ...dto, applicantSub: sub });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Get('event/:eventId')
  async list(
    @Param('eventId') eventId: string,
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: 'pending' | 'approved' | 'rejected' | 'all',
  ) {
    const { sub } = getAuthUser(req);
    await this.events.requireHost(eventId, sub);
    return await this.apps.listForEvent(eventId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status: status ?? 'all',
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Patch(':id/decision')
  async decide(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: DecisionDto,
  ) {
    const { sub } = getAuthUser(req);
    const application = await this.apps.get(id);
    await this.events.requireHost(application.eventId, sub);
    return await this.apps.decide(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Put('event/:eventId/form')
  async setForm(
    @Param('eventId') eventId: string,
    @Req() req: Request,
    @Body() body: { schema: unknown },
  ) {
    const { sub } = getAuthUser(req);
    await this.events.requireHost(eventId, sub);
    return await this.apps.setFormSchema(eventId, body?.schema ?? {});
  }

  @Get('event/:eventId/form')
  async getForm(@Param('eventId') eventId: string) {
    return await this.apps.getFormSchema(eventId);
  }
}
