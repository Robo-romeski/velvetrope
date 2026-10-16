import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getAuthUser } from '../auth/request-user';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async global(@Req() req: Request, @Query('q') q?: string) {
    const { sub } = getAuthUser(req);
    return await this.search.search(sub, q ?? '');
  }
}
