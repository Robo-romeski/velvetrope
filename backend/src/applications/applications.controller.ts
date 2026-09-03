import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

interface SubmitDto {
  eventId: string;
  applicantSub: string;
  answers?: unknown;
  inviteCode?: string;
}

interface DecisionDto {
  status: 'approved' | 'rejected';
  reason?: string;
}

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly apps: ApplicationsService) {}

  // Attendee submission
  @UseGuards(JwtAuthGuard)
  @Post()
  async submit(@Req() req: any, @Body() dto: SubmitDto) {
    const userSub = req?.user?.sub as string | undefined;
    const applicantSub = userSub || dto.applicantSub;
    return await this.apps.submit({ ...dto, applicantSub });
  }

  // Host list for event
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Get('event/:eventId')
  async list(
    @Param('eventId') eventId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: 'pending' | 'approved' | 'rejected' | 'all',
  ) {
    return await this.apps.listForEvent(eventId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status: status ?? 'all',
    });
  }

  // Host decision
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Patch(':id/decision')
  async decide(@Param('id') id: string, @Body() dto: DecisionDto) {
    return await this.apps.decide(id, dto);
  }

  // Application form schema (host set, public/attendee get)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Put('event/:eventId/form')
  async setForm(@Param('eventId') eventId: string, @Body() body: { schema: unknown }) {
    return await this.apps.setFormSchema(eventId, body?.schema ?? {});
  }

  @Get('event/:eventId/form')
  async getForm(@Param('eventId') eventId: string) {
    return await this.apps.getFormSchema(eventId);
  }
}


