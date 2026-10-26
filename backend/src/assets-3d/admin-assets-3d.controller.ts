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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getAuthUser } from '../auth/request-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { Asset3dStatus } from './asset-3d.entity';
import { Assets3dService } from './assets-3d.service';

type MetadataBody = {
  title?: string;
  slug?: string;
  description?: string | null;
  category?: string;
  tags?: string[];
};

type UploadBody = {
  kind?: 'model' | 'thumbnail';
  filename?: string;
  contentType?: string;
  sizeBytes?: number;
  objectKey?: string;
};

@Controller('admin/assets-3d')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAssets3dController {
  constructor(private readonly assets: Assets3dService) {}

  @Get()
  async list(
    @Query('query') query?: string,
    @Query('status') status?: Asset3dStatus | 'all',
  ) {
    return await this.assets.listAdmin({ query, status: status ?? 'all' });
  }

  @Post()
  async create(@Req() req: Request, @Body() body: MetadataBody) {
    return await this.assets.create(getAuthUser(req).sub, body);
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return await this.assets.getAdmin(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: MetadataBody) {
    return await this.assets.update(id, body);
  }

  @Post(':id/uploads')
  async requestUpload(@Param('id') id: string, @Body() body: UploadBody) {
    return await this.assets.requestUpload(id, body);
  }

  @Post(':id/uploads/complete')
  async completeUpload(@Param('id') id: string, @Body() body: UploadBody) {
    return await this.assets.completeUpload(id, body);
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    return await this.assets.publish(id);
  }

  @Post(':id/unpublish')
  async unpublish(@Param('id') id: string) {
    return await this.assets.unpublish(id);
  }
}
