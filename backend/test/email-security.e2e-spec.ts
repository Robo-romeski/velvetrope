import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { registerPayload } from './register-payload';

describe('Email security (e2e)', () => {
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

  it('rejects forgot-password for malformed recipient strings', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'a@b.com,c@d.com' })
      .expect(400);
  });

  it('does not expose a generic send-mail API', async () => {
    await request(app.getHttpServer()).post('/email/send').expect(404);
    await request(app.getHttpServer()).post('/mail/send').expect(404);
  });

  it('password reset only targets registered email (captured)', async () => {
    const email = `email-sec-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerPayload({ email }))
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'other@example.com' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(201);
  });
});
