import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Global search (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `search-${Date.now()}@example.com`,
        password: 'password1',
        name: 'Search User',
      })
      .expect(201);
    token = reg.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires auth and returns structured sections', async () => {
    await request(app.getHttpServer()).get('/search?q=test').expect(401);

    const res = await request(app.getHttpServer())
      .get('/search?q=')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toMatchObject({
      query: '',
      members: expect.any(Array),
      groups: expect.any(Array),
      learning: expect.any(Array),
      events: expect.any(Array),
    });
  });
});
