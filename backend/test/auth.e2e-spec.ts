import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Auth (e2e)', () => {
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

  it('GET /protected should return 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/protected')
      .expect(401);
  });

  it('GET /protected should return 401 with invalid token', async () => {
    await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);
  });
});
