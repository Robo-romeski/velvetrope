import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { EventsService, EventItem } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { getAuthUser } from '../auth/request-user';

interface CreateEventDto {
  title: string;
  description?: string;
  date: string;
  capacity: number;
}

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  async list(): Promise<EventItem[]> {
    return await this.events.list();
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<EventItem> {
    return await this.events.get(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateEventDto,
  ): Promise<EventItem> {
    const { sub } = getAuthUser(req);
    return await this.events.create({ ...dto, hostId: sub });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: Partial<CreateEventDto>,
  ): Promise<EventItem> {
    const { sub } = getAuthUser(req);
    return await this.events.update(id, sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    const { sub } = getAuthUser(req);
    await this.events.remove(id, sub);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post(':id/publish')
  async publish(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<EventItem> {
    const { sub } = getAuthUser(req);
    return await this.events.update(id, sub, { status: 'published' });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<EventItem> {
    const { sub } = getAuthUser(req);
    return await this.events.update(id, sub, { status: 'cancelled' });
  }
}
