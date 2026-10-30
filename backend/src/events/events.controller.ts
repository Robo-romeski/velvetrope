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
import { EventsService, EventItem, HostEventItem } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { getAuthUser, getOptionalAuthUser } from '../auth/request-user';

interface CreateEventDto {
  title: string;
  description?: string;
  date: string;
  capacity: number;
  isDiscoveryVisible?: boolean;
  ticketPriceCents?: number;
  requirePhotoCheckin?: boolean;
  requireIdentityVerification?: boolean;
  locationPublicLabel?: string;
  locationExactAddress?: string;
}

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  async list(): Promise<EventItem[]> {
    return await this.events.listPublished();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Get('mine')
  async mine(@Req() req: Request): Promise<HostEventItem[]> {
    const { sub } = getAuthUser(req);
    return await this.events.listByHost(sub);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async get(@Param('id') id: string, @Req() req: Request): Promise<EventItem> {
    const viewer = getOptionalAuthUser(req);
    return await this.events.getForViewer(id, viewer?.sub ?? null);
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
