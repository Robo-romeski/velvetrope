import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Direct messages (e2e)', () => {
  let app: INestApplication<App>;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let userAId: string;
  let userBId: string;
  let conversationId: string;

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
          email: `messages-${label}-${Date.now()}@example.com`,
          password: 'password1',
          name: label,
        })
        .expect(201);
      return {
        token: response.body.token as string,
        userId: response.body.user.id as string,
      };
    };

    const a = await register('Alex');
    const b = await register('Blake');
    const c = await register('Casey');
    tokenA = a.token;
    tokenB = b.token;
    tokenC = c.token;
    userAId = a.userId;
    userBId = b.userId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/messages/conversations')
      .expect(401);
  });

  it('defaults to accepting messages only from people the recipient follows', async () => {
    const own = await request(app.getHttpServer())
      .get('/members/me/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(own.body.messagePermission).toBe('following');

    await request(app.getHttpServer())
      .post('/messages/conversations')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ recipientId: userAId })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/members/${userBId}/follow`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/messages/conversations')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ recipientId: userAId })
      .expect(201);
    conversationId = created.body.id;
    expect(created.body.otherMember.userId).toBe(userAId);
    expect(created.body.unreadCount).toBe(0);

    const duplicate = await request(app.getHttpServer())
      .post('/messages/conversations')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ recipientId: userAId })
      .expect(201);
    expect(duplicate.body.id).toBe(conversationId);
  });

  it('sends messages, reports unread state, and marks threads read', async () => {
    const sent = await request(app.getHttpServer())
      .post(`/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ body: '  Hello privately  ' })
      .expect(201);
    expect(sent.body.body).toBe('Hello privately');

    const inboxA = await request(app.getHttpServer())
      .get('/messages/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(inboxA.body).toHaveLength(1);
    expect(inboxA.body[0].unreadCount).toBe(1);

    const inboxB = await request(app.getHttpServer())
      .get('/messages/conversations')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(inboxB.body[0].unreadCount).toBe(0);

    const thread = await request(app.getHttpServer())
      .get(`/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(thread.body.messages).toHaveLength(1);
    expect(thread.body.messages[0].body).toBe('Hello privately');

    await request(app.getHttpServer())
      .patch(`/messages/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const readInbox = await request(app.getHttpServer())
      .get('/messages/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(readInbox.body[0].unreadCount).toBe(0);
  });

  it('prevents non-participants from reading a thread', async () => {
    await request(app.getHttpServer())
      .get(`/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${tokenC}`)
      .expect(404);
  });

  it('enforces nobody and all-members recipient settings', async () => {
    await request(app.getHttpServer())
      .patch('/members/me/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ messagePermission: 'none' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ body: 'Should not send' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/messages/conversations')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ recipientId: userAId })
      .expect(403);

    await request(app.getHttpServer())
      .patch('/members/me/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ messagePermission: 'members' })
      .expect(200);

    const memberConversation = await request(app.getHttpServer())
      .post('/messages/conversations')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ recipientId: userAId })
      .expect(201);
    expect(memberConversation.body.otherMember.userId).toBe(userAId);
  });

  it('hides and denies conversations after either member blocks the other', async () => {
    await request(app.getHttpServer())
      .post(`/members/${userBId}/block`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    const inboxA = await request(app.getHttpServer())
      .get('/messages/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(
      inboxA.body.find((row: { id: string }) => row.id === conversationId),
    ).toBeUndefined();

    const inboxB = await request(app.getHttpServer())
      .get('/messages/conversations')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(inboxB.body).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ body: 'Blocked message' })
      .expect(404);

    await request(app.getHttpServer())
      .post('/messages/conversations')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ recipientId: userAId })
      .expect(404);
  });
});
