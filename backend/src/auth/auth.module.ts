import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ProtectedController } from './protected.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [ProtectedController, AuthController],
  providers: [JwtAuthGuard, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
