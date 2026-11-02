import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailRateLimitService } from './email-rate-limit.service';

@Global()
@Module({
  providers: [EmailRateLimitService, EmailService],
  exports: [EmailService, EmailRateLimitService],
})
export class EmailModule {}
