import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { adminAuth } from './auth-headers';

describe('Member kudos (e2e)', () => {
  let app: INestApplication<App>;
  let tokenA: string;
  let tokenB: string;
  let userAId: string;
  let userBId: string;
  let slugB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const regA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `kudos-a-${Date.now()}@example.com`,
        password: 'password1',
        name: 'Kudo Giver',
      })
      .expect(201);
    tokenA = regA.body.token;
    userAId = regA.body.user.id;

    const regB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `kudos-b-${Date.now()}@example.com`,
        password: 'password1',
        name: 'Kudo Recipient',
      })
      .expect(201);
    tokenB = regB.body.token;
    userBId = regB.body.user.id;

    const profileB = await request(app.getHttpServer())
      .get('/members/me/profile')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    slugB = profileB.body.slug as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('submit → approve → visible on profile; reciprocal throttled; admin suppress', async () => {
    const created = await request(app.getHttpServer())
      .post('/kudos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        recipientId: userBId,
        kudoType: 'welcoming',
        message: 'Thanks for the warm hello',
      })
      .expect(201);
    const kudoId = created.body.id as string;
    expect(created.body.status).toBe('pending');

    const beforePublic = await request(app.getHttpServer())
      .get(`/kudos/profile/${slugB}`)
      .expect(200);
    expect(beforePublic.body).toEqual([]);

    await request(app.getHttpServer())
      .post('/kudos')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        recipientId: userAId,
        kudoType: 'welcoming',
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/kudos/${kudoId}/approve`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const afterPublic = await request(app.getHttpServer())
      .get(`/kudos/profile/${slugB}`)
      .expect(200);
    expect(afterPublic.body).toHaveLength(1);
    expect(afterPublic.body[0].kudoType).toBe('welcoming');

    await request(app.getHttpServer())
      .patch(`/kudos/${kudoId}/suppress`)
      .set(adminAuth())
      .expect(200);

    const afterSuppress = await request(app.getHttpServer())
      .get(`/kudos/profile/${slugB}`)
      .expect(200);
    expect(afterSuppress.body).toEqual([]);
  });

  it('rejects self-kudos', async () => {
    await request(app.getHttpServer())
      .post('/kudos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        recipientId: userAId,
        kudoType: 'welcoming',
      })
      .expect(400);
  });
});
