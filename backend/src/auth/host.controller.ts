import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('host-only')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HostController {
  @Get()
  @Roles('host')
  getHostOnly() {
    return { ok: true };
  }
}
