import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

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
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .send({ title: 'Party', description: 'Fun', date: new Date().toISOString(), capacity: 10 })
      .expect(201);
    const id = create.body.id as string;

    await request(app.getHttpServer()).get(`/events/${id}`).expect(200);

    await request(app.getHttpServer())
      .patch(`/events/${id}`)
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .send({ capacity: 15 })
      .expect(200);

    const pub = await request(app.getHttpServer())
      .post(`/events/${id}/publish`)
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .expect(201);
    expect(pub.body.status).toBe('published');

    const can = await request(app.getHttpServer())
      .post(`/events/${id}/cancel`)
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .expect(201);
    expect(can.body.status).toBe('cancelled');

    await request(app.getHttpServer())
      .delete(`/events/${id}`)
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .expect(200);
  });
});


