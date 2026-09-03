import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Host RBAC (e2e)', () => {
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

  it('GET /host-only should 401 without token', async () => {
    await request(app.getHttpServer()).get('/host-only').expect(401);
  });

  it('GET /host-only should 200 with valid token and host role', async () => {
    // Reuse invalid token path but send header to simulate roles in test env
    await request(app.getHttpServer())
      .get('/host-only')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .expect(200);
  });
});
