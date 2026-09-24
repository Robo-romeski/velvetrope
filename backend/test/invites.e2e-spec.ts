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

  it('host can list invite codes for their event', async () => {
    const event = await createEvent(app.getHttpServer());
    const gen = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);

    const listed = await request(app.getHttpServer())
      .get(`/invites/event/${event.id}`)
      .set(hostAuth())
      .expect(200);
    expect(
      listed.body.find((i: { code: string }) => i.code === gen.body.code),
    ).toBeTruthy();

    await request(app.getHttpServer())
      .get(`/invites/event/${event.id}`)
      .set(hostAuth('other-host'))
      .expect(403);
  });

  it('host can read invite stats for their event', async () => {
    const event = await createEvent(app.getHttpServer());

    await request(app.getHttpServer())
      .get(`/invites/event/${event.id}/stats`)
      .set(hostAuth())
      .expect(200)
      .expect({
        eventId: event.id,
        total: 0,
        redeemed: 0,
        unused: 0,
        expiredUnused: 0,
        conversionRate: 0,
      });

    const gen = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post('/invites/redeem/' + gen.body.code)
      .set(userAuth('user|stats'))
      .expect(201);

    const stats = await request(app.getHttpServer())
      .get(`/invites/event/${event.id}/stats`)
      .set(hostAuth())
      .expect(200);

    expect(stats.body.total).toBe(1);
    expect(stats.body.redeemed).toBe(1);
    expect(stats.body.conversionRate).toBe(1);

    await request(app.getHttpServer())
      .get(`/invites/event/${event.id}/stats`)
      .set(hostAuth('other-host'))
      .expect(403);
  });

  it('rejects expired invite codes on redeem and validate', async () => {
    const event = await createEvent(app.getHttpServer());

    const gen = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .send({ expiresInHours: 1 / 3600 })
      .expect(201);

    const code = gen.body.code as string;
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const val = await request(app.getHttpServer())
      .get(`/invites/validate/${code}`)
      .expect(200);
    expect(val.body.valid).toBe(false);
    expect(val.body.expired).toBe(true);

    await request(app.getHttpServer())
      .post(`/invites/redeem/${code}`)
      .set(userAuth('user|expired'))
      .expect(400);
  });
});
