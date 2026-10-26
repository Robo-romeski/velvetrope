import { Controller, Get, Param, Query } from '@nestjs/common';
import { Assets3dService } from './assets-3d.service';

@Controller('assets-3d')
export class Assets3dController {
  constructor(private readonly assets: Assets3dService) {}

  @Get()
  async list(
    @Query('query') query?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return await this.assets.listPublished({
      query,
      category,
      tag,
      page: page ? Number.parseInt(page, 10) : undefined,
      pageSize: pageSize ? Number.parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    return await this.assets.getPublished(slug);
  }
}
