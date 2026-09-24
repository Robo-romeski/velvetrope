import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { RolesGuard } from './auth/roles.guard';
import { HostController } from './auth/host.controller';
import { EventsModule } from './events/events.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeModule } from './stripe/stripe.module';
import { InvitesModule } from './invites/invites.module';
import { CheckinModule } from './checkin/checkin.module';
import { ApplicationsModule } from './applications/applications.module';
import { buildTypeOrmOptions } from './database/typeorm-options';
import { ThrottlerModule } from '@nestjs/throttler';
import { SecurityModule } from './security/security.module';
import { EmailModule } from './email/email.module';
import { TrustModule } from './trust/trust.module';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: isTest ? 10_000 : 120,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().default(3010),
      }),
    }),
    SecurityModule,
    EmailModule,
    AuthModule,
    TypeOrmModule.forRoot({
      ...buildTypeOrmOptions(),
      retryAttempts: process.env.NODE_ENV === 'test' ? 1 : 10,
    }),
    EventsModule,
    ApplicationsModule,
    StripeModule,
    InvitesModule,
    CheckinModule,
    TrustModule,
  ],
  controllers: [AppController, HealthController, HostController],
  providers: [AppService, RolesGuard],
})
export class AppModule {}
