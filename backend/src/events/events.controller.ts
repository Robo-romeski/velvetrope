import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { EventsService, EventItem } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

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
  async create(@Body() dto: CreateEventDto): Promise<EventItem> {
    return await this.events.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateEventDto>): Promise<EventItem> {
    return await this.events.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    await this.events.remove(id);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post(':id/publish')
  async publish(@Param('id') id: string): Promise<EventItem> {
    return await this.events.update(id, { status: 'published' } as any);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post(':id/cancel')
  async cancel(@Param('id') id: string): Promise<EventItem> {
    return await this.events.update(id, { status: 'cancelled' } as any);
  }
}


