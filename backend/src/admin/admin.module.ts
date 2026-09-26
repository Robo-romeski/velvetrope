import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditEntity } from './admin-audit.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserEntity } from '../auth/user.entity';
import { EventEntity } from '../events/event.entity';
import { TrustReportEntity } from '../trust/report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      EventEntity,
      TrustReportEntity,
      AdminAuditEntity,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
