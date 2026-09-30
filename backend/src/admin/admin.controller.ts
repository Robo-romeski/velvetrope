import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { getAuthUser } from '../auth/request-user';
import type { AccountStatus } from '../auth/user.entity';
import type { EventEntity } from '../events/event.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('summary')
  async summary() {
    return await this.admin.summary();
  }

  @Get('users')
  async users(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('query') query?: string,
    @Query('status') status?: AccountStatus | 'all',
  ) {
    return await this.admin.listUsers({
      page: page ? Number.parseInt(page, 10) : undefined,
      pageSize: pageSize ? Number.parseInt(pageSize, 10) : undefined,
      query,
      status: status ?? 'all',
    });
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Req() req: Request,
    @Body()
    body: {
      roles?: string[];
      accountStatus?: AccountStatus;
      suspensionReason?: string;
    },
  ) {
    const { sub } = getAuthUser(req);
    return await this.admin.updateUser(sub, id, body);
  }

  @Get('events')
  async events(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('query') query?: string,
    @Query('status') status?: EventEntity['status'] | 'all',
  ) {
    return await this.admin.listEvents({
      page: page ? Number.parseInt(page, 10) : undefined,
      pageSize: pageSize ? Number.parseInt(pageSize, 10) : undefined,
      query,
      status: status ?? 'all',
    });
  }

  @Post('events/:id/cancel')
  async cancelEvent(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: { reason?: string },
  ) {
    const { sub } = getAuthUser(req);
    return await this.admin.cancelEvent(sub, id, body.reason);
  }

  @Get('audit')
  async audit(@Query('limit') limit?: string) {
    return await this.admin.listAudit(
      limit ? Number.parseInt(limit, 10) : undefined,
    );
  }
}
