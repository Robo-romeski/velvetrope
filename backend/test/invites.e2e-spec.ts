import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Invites (e2e)', () => {
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

  it('host can generate, public can validate, user can redeem', async () => {
    const gen = await request(app.getHttpServer())
      .post('/invites/generate/eventA')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .expect(201);
    const code = gen.body.code as string;

    const val = await request(app.getHttpServer())
      .get(`/invites/validate/${code}`)
      .expect(200);
    expect(val.body.valid).toBe(true);

    const red = await request(app.getHttpServer())
      .post(`/invites/redeem/${code}`)
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '[]')
      .send({ userSub: 'user|xyz' })
      .expect(201);
    expect(red.body.usedBy).toBe('user|xyz');

    await request(app.getHttpServer())
      .post(`/invites/redeem/${code}`)
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '[]')
      .send({ userSub: 'user|abc' })
      .expect(400);
  });
});


