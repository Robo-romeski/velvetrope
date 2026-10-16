import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureHttpApp } from './../src/bootstrap';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/healthz (GET) should return 200', async () => {
    await request(app.getHttpServer())
      .get('/healthz')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('/healthz (GET) should include security headers from helmet', async () => {
    const res = await request(app.getHttpServer()).get('/healthz').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('/healthz/integrations (GET) returns integration flags', async () => {
    const res = await request(app.getHttpServer())
      .get('/healthz/integrations')
      .expect(200);
    expect(res.body).toMatchObject({
      database: expect.any(Boolean),
      stripe: {
        secretKey: expect.any(Boolean),
        webhookSecret: expect.any(Boolean),
        liveMode: expect.any(Boolean),
      },
      email: { resend: expect.any(Boolean), fromConfigured: expect.any(Boolean) },
      s3: { bucket: expect.any(Boolean) },
    });
  });
});
