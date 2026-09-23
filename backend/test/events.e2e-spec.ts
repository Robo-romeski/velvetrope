import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hostAuth } from './auth-headers';

describe('Events (e2e)', () => {
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

  it('GET /events should return empty list initially', async () => {
    const res = await request(app.getHttpServer()).get('/events').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /events requires host role', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .send({ title: 'Party', date: new Date().toISOString(), capacity: 10 })
      .expect(401);
  });

  it('POST/GET/PATCH/DELETE happy path with host role (test override)', async () => {
    const create = await request(app.getHttpServer())
      .post('/events')
      .set(hostAuth())
      .send({
        title: 'Party',
        description: 'Fun',
        date: new Date().toISOString(),
        capacity: 10,
      })
      .expect(201);
    const id = create.body.id as string;
    expect(create.body.hostId).toBe('test-user');
    expect(create.body.status).toBe('draft');

    const publicBefore = await request(app.getHttpServer())
      .get('/events')
      .expect(200);
    expect(
      publicBefore.body.find((e: { id: string }) => e.id === id),
    ).toBeFalsy();

    const mine = await request(app.getHttpServer())
      .get('/events/mine')
      .set(hostAuth())
      .expect(200);
    expect(mine.body.find((e: { id: string }) => e.id === id)).toBeTruthy();

    await request(app.getHttpServer()).get(`/events/${id}`).expect(200);

    await request(app.getHttpServer())
      .patch(`/events/${id}`)
      .set(hostAuth())
      .send({ capacity: 15 })
      .expect(200);

    const pub = await request(app.getHttpServer())
      .post(`/events/${id}/publish`)
      .set(hostAuth())
      .expect(201);
    expect(pub.body.status).toBe('published');

    const publicAfter = await request(app.getHttpServer())
      .get('/events')
      .expect(200);
    expect(
      publicAfter.body.find((e: { id: string }) => e.id === id),
    ).toBeTruthy();

    const can = await request(app.getHttpServer())
      .post(`/events/${id}/cancel`)
      .set(hostAuth())
      .expect(201);
    expect(can.body.status).toBe('cancelled');

    await request(app.getHttpServer())
      .delete(`/events/${id}`)
      .set(hostAuth())
      .expect(200);
  });

  it('rejects mutations from a different host', async () => {
    const create = await request(app.getHttpServer())
      .post('/events')
      .set(hostAuth('host-a'))
      .send({ title: 'Private', date: new Date().toISOString(), capacity: 5 })
      .expect(201);
    const id = create.body.id as string;

    await request(app.getHttpServer())
      .patch(`/events/${id}`)
      .set(hostAuth('host-b'))
      .send({ capacity: 99 })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/events/${id}`)
      .set(hostAuth('host-b'))
      .expect(403);
  });

  it('GET /events/mine requires a host and returns only that host events', async () => {
    await request(app.getHttpServer()).get('/events/mine').expect(401);

    const created = await request(app.getHttpServer())
      .post('/events')
      .set(hostAuth('host-a'))
      .send({ title: 'A only', date: new Date().toISOString(), capacity: 3 })
      .expect(201);

    const mineA = await request(app.getHttpServer())
      .get('/events/mine')
      .set(hostAuth('host-a'))
      .expect(200);
    expect(
      mineA.body.find((e: { id: string }) => e.id === created.body.id),
    ).toBeTruthy();

    const mineB = await request(app.getHttpServer())
      .get('/events/mine')
      .set(hostAuth('host-b'))
      .expect(200);
    expect(
      mineB.body.find((e: { id: string }) => e.id === created.body.id),
    ).toBeFalsy();
  });
});
