import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Community (e2e)', () => {
  let app: INestApplication<App>;
  let tokenA: string;
  let tokenB: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const emailA = `community-a-${Date.now()}@example.com`;
    const emailB = `community-b-${Date.now()}@example.com`;
    const regA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: emailA, password: 'password1', name: 'Alex' })
      .expect(201);
    tokenA = regA.body.token;
    userAId = regA.body.user.id;

    const regB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: emailB, password: 'password1', name: 'Blake' })
      .expect(201);
    tokenB = regB.body.token;
    userBId = regB.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates profile, respects visibility, blocks, and groups', async () => {
    const own = await request(app.getHttpServer())
      .get('/members/me/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(own.body.userId).toBe(userAId);
    expect(typeof own.body.slug).toBe('string');

    await request(app.getHttpServer())
      .patch('/members/me/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        bio: 'Hello community',
        interests: ['ENM', 'workshops'],
        visibility: { bio: 'members' },
      })
      .expect(200);

    const viewedByB = await request(app.getHttpServer())
      .get(`/members/${userAId}/profile`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(viewedByB.body.bio).toBe('Hello community');

    await request(app.getHttpServer())
      .patch('/members/me/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ visibility: { bio: 'private' } })
      .expect(200);

    const hidden = await request(app.getHttpServer())
      .get(`/members/${userAId}/profile`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(hidden.body.bio).toBeUndefined();

    const group = await request(app.getHttpServer())
      .post('/groups')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Velvet Circle', privacy: 'public' })
      .expect(201);
    expect(group.body.isMember).toBe(true);

    const post = await request(app.getHttpServer())
      .post(`/groups/${group.body.slug}/posts`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Welcome', body: 'First post' })
      .expect(201);
    expect(post.body.body).toBe('First post');

    await request(app.getHttpServer())
      .post(`/groups/${group.body.slug}/join`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(201);

    const comment = await request(app.getHttpServer())
      .post(`/posts/${post.body.id}/comments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ body: 'Great intro' })
      .expect(201);
    expect(comment.body.body).toBe('Great intro');

    await request(app.getHttpServer())
      .post(`/members/${userBId}/block`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    await request(app.getHttpServer())
      .get(`/members/${userBId}/profile`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });
});
