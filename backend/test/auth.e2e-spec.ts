import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(() => {
    process.env.EXPOSE_PASSWORD_RESET_TOKEN = 'true';
  });

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

  it('GET /protected should return 401 without token', async () => {
    await request(app.getHttpServer()).get('/protected').expect(401);
  });

  it('GET /protected should return 401 with invalid token', async () => {
    await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);
  });

  it('registers, logs in, and returns the current user', async () => {
    const email = `host-${Date.now()}@example.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'password1',
        name: 'Ada',
        host: true,
      })
      .expect(201);

    expect(registered.body.user.email).toBe(email);
    expect(registered.body.user.roles).toEqual(
      expect.arrayContaining(['attendee', 'host']),
    );
    expect(typeof registered.body.token).toBe('string');
    expect(registered.body.user.passwordHash).toBeUndefined();

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${registered.body.token}`)
      .expect(200);
    expect(me.body.email).toBe(email);

    const loggedIn = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password1' })
      .expect(201);
    expect(loggedIn.body.user.id).toBe(registered.body.user.id);

    await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${loggedIn.body.token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/host-only')
      .set('Authorization', `Bearer ${loggedIn.body.token}`)
      .expect(200);
  });

  it('rejects duplicate emails and bad passwords', async () => {
    const email = `dup-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password1' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password1' })
      .expect(409);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-pass' })
      .expect(401);
  });

  it('password reset flow updates password', async () => {
    const email = `reset-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password1' })
      .expect(201);

    const forgot = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(201);
    expect(typeof forgot.body.resetToken).toBe('string');

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: forgot.body.resetToken, password: 'newpassword9' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password1' })
      .expect(401);

    const loggedIn = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'newpassword9' })
      .expect(201);
    expect(loggedIn.body.user.email).toBe(email);
  });

  it('attendee tokens cannot call host-only routes', async () => {
    const email = `guest-${Date.now()}@example.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password1', host: false })
      .expect(201);

    expect(registered.body.user.roles).toEqual(['attendee']);

    await request(app.getHttpServer())
      .get('/host-only')
      .set('Authorization', `Bearer ${registered.body.token}`)
      .expect(403);
  });
});
