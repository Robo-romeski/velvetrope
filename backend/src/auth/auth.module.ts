import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ProtectedController } from './protected.controller';
import { jwksProvider } from './jwks.provider';

@Module({
  controllers: [ProtectedController],
  providers: [JwtAuthGuard, jwksProvider],
})
export class AuthModule {}
