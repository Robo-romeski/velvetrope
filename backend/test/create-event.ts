import request from 'supertest';
import { hostAuth } from './auth-headers';

export async function createEvent(
  server: Parameters<typeof request>[0],
  hostSub = 'test-user',
  overrides: Record<string, unknown> = {},
) {
  const res = await request(server)
    .post('/events')
    .set(hostAuth(hostSub))
    .send({
      title: 'Party',
      date: new Date().toISOString(),
      capacity: 20,
      ...overrides,
    })
    .expect(201);
  return res.body as { id: string; hostId: string };
}
