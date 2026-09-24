import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustReportEntity } from './report.entity';
import { TrustService } from './trust.service';
import { TrustController } from './trust.controller';
import { UserEntity } from '../auth/user.entity';
import { ApplicationEntity } from '../applications/application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrustReportEntity,
      UserEntity,
      ApplicationEntity,
    ]),
  ],
  controllers: [TrustController],
  providers: [TrustService],
})
export class TrustModule {}
