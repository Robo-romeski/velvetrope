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
import { EventEntity } from './events/event.entity';
import { ApplicationEntity } from './applications/application.entity';
import { ApplicationFormEntity } from './applications/application-form.entity';
import { StripeModule } from './stripe/stripe.module';
import { StripeAccountEntity } from './stripe/stripe-account.entity';
import { InvitesModule } from './invites/invites.module';
import { InviteEntity } from './invites/invite.entity';
import { CheckinModule } from './checkin/checkin.module';
import { CheckinTicketEntity } from './checkin/checkin-ticket.entity';
import { ApplicationsModule } from './applications/applications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().default(3000),
      }),
    }),
    AuthModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || (process.env.NODE_ENV === 'test' ? ':memory:' : 'data/dev.sqlite'),
      entities: [EventEntity, ApplicationEntity, ApplicationFormEntity, InviteEntity, CheckinTicketEntity, StripeAccountEntity],
      synchronize: true,
    }),
    EventsModule,
    ApplicationsModule,
    StripeModule,
    InvitesModule,
    CheckinModule,
  ],
  controllers: [AppController, HealthController, HostController],
  providers: [AppService, RolesGuard],
})
export class AppModule {}
