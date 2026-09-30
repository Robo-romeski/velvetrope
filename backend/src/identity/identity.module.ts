import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityController } from './identity.controller';
import { IdentityVerificationEntity } from './identity-verification.entity';
import { PersonaService } from './persona.service';

@Module({
  imports: [TypeOrmModule.forFeature([IdentityVerificationEntity])],
  controllers: [IdentityController],
  providers: [PersonaService],
  exports: [PersonaService],
})
export class IdentityModule {}
