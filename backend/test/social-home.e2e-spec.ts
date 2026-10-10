import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Social home (e2e)', () => {
  let app: INestApplication<App>;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let userAId: string;
  let userBId: string;
  let membersPostId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const register = async (label: string) => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `social-home-${label}-${Date.now()}@example.com`,
          password: 'password1',
          name: label,
        })
        .expect(201);
      const token = response.body.token as string;
      const userId = response.body.user.id as string;
      await request(app.getHttpServer())
        .get('/members/me/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      return { token, userId };
    };

    const a = await register('Alex Feed');
    const b = await register('Blake Author');
    const c = await register('Casey Reader');
    tokenA = a.token;
    tokenB = b.token;
    tokenC = c.token;
    userAId = a.userId;
    userBId = b.userId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication for social feed APIs', async () => {
    await request(app.getHttpServer()).get('/social/feed').expect(401);
    await request(app.getHttpServer()).get('/social/discovery').expect(401);
    await request(app.getHttpServer()).get('/social/notifications').expect(401);
  });

  it('creates follower-only posts and filters them from non-followers', async () => {
    const created = await request(app.getHttpServer())
      .post('/social/posts')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        body: 'A note for people who follow me.',
        audience: 'followers',
        linkUrl: 'https://example.com/resource',
      })
      .expect(201);
    expect(created.body.audience).toBe('followers');
    expect(created.body.linkUrl).toBe('https://example.com/resource');

    const beforeFollow = await request(app.getHttpServer())
      .get('/social/feed?scope=following')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(beforeFollow.body).toHaveLength(0);

    await request(app.getHttpServer())
      .post(`/members/${userBId}/follow`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    const followingFeed = await request(app.getHttpServer())
      .get('/social/feed?scope=following')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(followingFeed.body).toHaveLength(1);
    expect(followingFeed.body[0].body).toContain('people who follow me');

    const outsiderFeed = await request(app.getHttpServer())
      .get('/social/feed?scope=discover')
      .set('Authorization', `Bearer ${tokenC}`)
      .expect(200);
    expect(
      outsiderFeed.body.find(
        (post: { id: string }) => post.id === created.body.id,
      ),
    ).toBeUndefined();
  });

  it('shows members posts in discovery and supports comments', async () => {
    const created = await request(app.getHttpServer())
      .post('/social/posts')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        body: 'A community-wide question.',
        audience: 'members',
      })
      .expect(201);
    membersPostId = created.body.id;

    const discover = await request(app.getHttpServer())
      .get('/social/feed?scope=discover')
      .set('Authorization', `Bearer ${tokenC}`)
      .expect(200);
    expect(
      discover.body.find((post: { id: string }) => post.id === membersPostId),
    ).toBeDefined();

    await request(app.getHttpServer())
      .post(`/posts/${membersPostId}/comments`)
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ body: 'A thoughtful reply.' })
      .expect(201);

    const comments = await request(app.getHttpServer())
      .get(`/posts/${membersPostId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(comments.body).toHaveLength(1);
    expect(comments.body[0].body).toBe('A thoughtful reply.');
  });

  it('discovers members and groups without exposing blocked profiles', async () => {
    const discovery = await request(app.getHttpServer())
      .get('/social/discovery?q=Blake')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(
      discovery.body.members.find(
        (member: { userId: string }) => member.userId === userBId,
      ),
    ).toBeDefined();
    expect(Array.isArray(discovery.body.groups)).toBe(true);
  });

  it('reports follow and comment notifications and marks them read', async () => {
    const notifications = await request(app.getHttpServer())
      .get('/social/notifications')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(notifications.body.unreadCount).toBeGreaterThanOrEqual(2);
    expect(
      notifications.body.items.some(
        (item: { type: string }) => item.type === 'follow',
      ),
    ).toBe(true);
    expect(
      notifications.body.items.some(
        (item: { type: string }) => item.type === 'comment',
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .patch('/social/notifications/read')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({})
      .expect(200);

    const read = await request(app.getHttpServer())
      .get('/social/notifications')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(read.body.unreadCount).toBe(0);
  });

  it('returns member wall posts and respects follower audience', async () => {
    const profile = await request(app.getHttpServer())
      .get('/members/me/profile')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const beforeFollow = await request(app.getHttpServer())
      .get(`/members/${profile.body.slug}/wall`)
      .set('Authorization', `Bearer ${tokenC}`)
      .expect(200);
    expect(
      beforeFollow.body.posts.some(
        (post: { body: string }) => post.body === 'A note for people who follow me.',
      ),
    ).toBe(false);
    expect(
      beforeFollow.body.posts.some(
        (post: { id: string }) => post.id === membersPostId,
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .post(`/members/${userBId}/follow`)
      .set('Authorization', `Bearer ${tokenC}`)
      .expect(201);

    const afterFollow = await request(app.getHttpServer())
      .get(`/members/${profile.body.slug}/wall`)
      .set('Authorization', `Bearer ${tokenC}`)
      .expect(200);
    expect(
      afterFollow.body.posts.some(
        (post: { body: string }) => post.body === 'A note for people who follow me.',
      ),
    ).toBe(true);
  });

  it('hides member wall from blocked viewers', async () => {
    const profile = await request(app.getHttpServer())
      .get('/members/me/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/members/${userBId}/block`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    await request(app.getHttpServer())
      .get(`/members/${profile.body.slug}/wall`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });

  it('removes blocked authors from feeds and discovery', async () => {
    await request(app.getHttpServer())
      .post(`/members/${userAId}/block`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(201);

    const feed = await request(app.getHttpServer())
      .get('/social/feed?scope=discover')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(
      feed.body.some(
        (post: { author: { userId: string } }) =>
          post.author.userId === userBId,
      ),
    ).toBe(false);

    const discovery = await request(app.getHttpServer())
      .get('/social/discovery?q=Blake')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(discovery.body.members).toHaveLength(0);
  });
});
