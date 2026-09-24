import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HostAuditInterceptor } from './host-audit.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HostAuditInterceptor,
    },
  ],
})
export class SecurityModule {}
