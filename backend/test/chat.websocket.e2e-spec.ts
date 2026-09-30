import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from './../src/app.module';

describe('Chat WebSocket (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  const connect = async (token: string): Promise<Socket> => {
    const socket = io(`${baseUrl}/chat`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });
    return socket;
  };

  const emitAck = <T>(
    socket: Socket,
    event: string,
    payload: unknown,
  ): Promise<T> =>
    new Promise((resolve, reject) => {
      socket
        .timeout(5000)
        .emit(event, payload, (error: unknown, response: T) => {
          if (error) {
            reject(
              error instanceof Error
                ? error
                : new Error('Socket acknowledgement failed'),
            );
            return;
          }
          resolve(response);
        });
    });

  it('authenticates, joins an event room, persists, and broadcasts', async () => {
    const nonce = Date.now();
    const password = 'password1';
    const host = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `ws-host-${nonce}@example.com`,
        password,
        host: true,
      })
      .expect(201);
    const attendee = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `ws-attendee-${nonce}@example.com`,
        password,
        host: false,
      })
      .expect(201);
    const event = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${host.body.token}`)
      .send({
        title: 'WebSocket Event',
        date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        capacity: 10,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/events/${event.body.id}/publish`)
      .set('Authorization', `Bearer ${host.body.token}`)
      .send({})
      .expect(201);
    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.body.id}`)
      .set('Authorization', `Bearer ${host.body.token}`)
      .send({})
      .expect(201);
    const application = await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', `Bearer ${attendee.body.token}`)
      .send({
        eventId: event.body.id,
        inviteCode: invite.body.code,
        answers: {},
        acceptedCodeOfConduct: true,
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/applications/${application.body.id}/decision`)
      .set('Authorization', `Bearer ${host.body.token}`)
      .send({ status: 'approved' })
      .expect(200);

    const hostSocket = await connect(host.body.token as string);
    const attendeeSocket = await connect(attendee.body.token as string);
    try {
      await emitAck(hostSocket, 'chat:join', { eventId: event.body.id });
      await emitAck(attendeeSocket, 'chat:join', {
        eventId: event.body.id,
      });
      const broadcast = new Promise<{ id: string; body: string }>((resolve) =>
        hostSocket.once('chat:message', resolve),
      );
      const sent = await emitAck<{ id: string; body: string }>(
        attendeeSocket,
        'chat:send',
        {
          eventId: event.body.id,
          body: 'Hello from the attendee socket.',
        },
      );
      const received = await broadcast;
      expect(sent.body).toBe('Hello from the attendee socket.');
      expect(received.id).toBe(sent.id);

      const history = await request(app.getHttpServer())
        .get(`/chat/event/${event.body.id}`)
        .set('Authorization', `Bearer ${attendee.body.token}`)
        .expect(200);
      expect(history.body.items[0].id).toBe(sent.id);
    } finally {
      hostSocket.disconnect();
      attendeeSocket.disconnect();
    }
  });
});
