import {
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
import { TrustService } from './trust.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { getAuthUser } from '../auth/request-user';

@Controller('trust')
export class TrustController {
  constructor(private readonly trust: TrustService) {}

  @Get('code-of-conduct')
  getCodeOfConduct() {
    return this.trust.getCodeOfConduct();
  }

  @UseGuards(JwtAuthGuard)
  @Post('reports')
  async createReport(
    @Req() req: Request,
    @Body()
    body: {
      subjectType?: 'event' | 'user';
      subjectId?: string;
      category?: string;
      details?: string;
    },
  ) {
    const { sub } = getAuthUser(req);
    return await this.trust.createReport({
      reporterSub: sub,
      subjectType: body.subjectType ?? 'event',
      subjectId: body.subjectId ?? '',
      category: body.category ?? 'other',
      details: body.details ?? '',
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('reports')
  async listReports() {
    return await this.trust.listReports();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('reports/:id/resolve')
  async resolveReport(@Param('id') id: string) {
    return await this.trust.resolveReport(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('export')
  async exportMine(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.trust.exportUserData(sub);
  }
}
