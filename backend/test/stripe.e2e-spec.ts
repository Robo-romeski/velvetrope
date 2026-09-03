import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Stripe (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /stripe/onboarding/:hostId requires host role', async () => {
    await request(app.getHttpServer())
      .get('/stripe/onboarding/host123')
      .set('Authorization', 'Bearer invalid.token')
      .expect(401);
  });

  it('GET /stripe/onboarding/:hostId returns a link for hosts', async () => {
    const res = await request(app.getHttpServer())
      .get('/stripe/onboarding/host123')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .expect(200);
    expect(typeof res.body?.url).toBe('string');
    expect(res.body.url).toContain('connect.stripe.com');
  });
});


