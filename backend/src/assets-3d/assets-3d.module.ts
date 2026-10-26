import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset3dEntity } from './asset-3d.entity';
import { Asset3dStorageService } from './asset-3d-storage.service';
import { AdminAssets3dController } from './admin-assets-3d.controller';
import { Assets3dController } from './assets-3d.controller';
import { Assets3dService } from './assets-3d.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset3dEntity])],
  controllers: [Assets3dController, AdminAssets3dController],
  providers: [Assets3dService, Asset3dStorageService],
  exports: [Assets3dService],
})
export class Assets3dModule {}
