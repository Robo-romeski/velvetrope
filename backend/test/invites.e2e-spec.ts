import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hostAuth, userAuth } from './auth-headers';
import { createEvent } from './create-event';

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
    const event = await createEvent(app.getHttpServer());

    const gen = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);
    const code = gen.body.code as string;

    const val = await request(app.getHttpServer())
      .get(`/invites/validate/${code}`)
      .expect(200);
    expect(val.body.valid).toBe(true);

    const red = await request(app.getHttpServer())
      .post(`/invites/redeem/${code}`)
      .set(userAuth('user|xyz'))
      .expect(201);
    expect(red.body.usedBy).toBe('user|xyz');

    await request(app.getHttpServer())
      .post(`/invites/redeem/${code}`)
      .set(userAuth('user|abc'))
      .expect(400);
  });

  it('cannot generate invites for another host event', async () => {
    const event = await createEvent(app.getHttpServer(), 'host-a');
    await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth('host-b'))
      .expect(403);
  });
});
