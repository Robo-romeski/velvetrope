import { INestApplication } from '@nestjs/common';
import * as express from 'express';
import helmet from 'helmet';
import { resolveCorsOrigins } from './security/cors.config';

export function configureHttpApp(app: INestApplication): void {
  app.use(helmet());
  const corsOrigins = resolveCorsOrigins();
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-test-roles',
      'x-test-sub',
    ],
  });
  app.use('/stripe/webhook', express.raw({ type: 'application/json' }));
}
