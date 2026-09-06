import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

describe('Infrastructure E2E Tests', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply global pipes and middleware as in production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 OK for GET /health', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return health status with uptime', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should return consistent response format', async () => {
      const response1 = await request(server).get('/health');
      const response2 = await request(server).get('/health');

      expect(response1.body).toHaveProperty('status');
      expect(response2.body).toHaveProperty('status');
      expect(response1.body.status).toBe(response2.body.status);
    });

    it('should respond quickly (under 100ms)', async () => {
      const startTime = Date.now();
      await request(server).get('/health').expect(200);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not require authentication', async () => {
      await request(server)
        .get('/health')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);
    });

    it('should handle HEAD requests', async () => {
      await request(server)
        .head('/health')
        .expect(200);
    });

    it('should not accept POST requests', async () => {
      await request(server)
        .post('/health')
        .expect(404);
    });
  });

  describe('CORS Configuration', () => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3010',
    ];

    it('should allow requests from localhost:3000', async () => {
      const response = await request(server)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should allow requests from localhost:3010', async () => {
      const response = await request(server)
        .get('/health')
        .set('Origin', 'http://localhost:3010')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3010');
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(server)
        .options('/api/events')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should allow credentials', async () => {
      const response = await request(server)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should expose necessary headers', async () => {
      const response = await request(server)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      const exposedHeaders = response.headers['access-control-expose-headers'];
      if (exposedHeaders) {
        expect(exposedHeaders).toContain('Content-Type');
      }
    });

    it('should reject requests from unauthorized origins in production mode', async () => {
      // Note: This test assumes production mode blocks unauthorized origins
      const response = await request(server)
        .get('/health')
        .set('Origin', 'http://malicious-site.com')
        .expect(200);

      // In development, CORS might be permissive
      // In production, unauthorized origins should not get CORS headers
      if (process.env.NODE_ENV === 'production') {
        expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
      }
    });

    it('should allow common HTTP methods', async () => {
      const response = await request(server)
        .options('/api/events')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toMatch(/GET/);
      expect(allowedMethods).toMatch(/POST/);
      expect(allowedMethods).toMatch(/PUT/);
      expect(allowedMethods).toMatch(/DELETE/);
    });

    it('should allow Authorization header', async () => {
      const response = await request(server)
        .options('/api/events')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Headers', 'Authorization')
        .expect(204);

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders.toLowerCase()).toContain('authorization');
    });

    it('should allow Content-Type header', async () => {
      const response = await request(server)
        .options('/api/events')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders.toLowerCase()).toContain('content-type');
    });
  });

  describe('Auth0 JWT Verification Setup', () => {
    const mockAuth0Domain = process.env.AUTH0_DOMAIN || 'test.auth0.com';
    const mockAudience = process.env.AUTH0_AUDIENCE || 'https://api.velvetrope.test';

    /**
     * Helper function to create a mock JWT token
     * Note: In real tests, this would be signed with a test private key
     */
    const createMockToken = (payload: any, secret: string = 'test-secret'): string => {
      return jwt.sign(payload, secret, { algorithm: 'HS256' });
    };

    it('should reject requests without Authorization header to protected endpoints', async () => {
      await request(server)
        .get('/api/events')
        .expect(401);
    });

    it('should reject requests with malformed Authorization header', async () => {
      await request(server)
        .get('/api/events')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });

    it('should reject requests with invalid Bearer token format', async () => {
      await request(server)
        .get('/api/events')
        .set('Authorization', 'Bearer')
        .expect(401);
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = createMockToken({
        sub: 'auth0|123456',
        aud: mockAudience,
        iss: `https://${mockAuth0Domain}/`,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      });

      await request(server)
        .get('/api/events')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject tokens with invalid signature', async () => {
      const invalidToken = createMockToken({
        sub: 'auth0|123456',
        aud: mockAudience,
        iss: `https://${mockAuth0Domain}/`,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }, 'wrong-secret');

      await request(server)
        .get('/api/events')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should reject tokens with missing required claims', async () => {
      const tokenWithoutSub = createMockToken({
        aud: mockAudience,
        iss: `https://${mockAuth0Domain}/`,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await request(server)
        .get('/api/events')
        .set('Authorization', `Bearer ${tokenWithoutSub}`)
        .expect(401);
    });

    it('should reject tokens with incorrect audience', async () => {
      const tokenWithWrongAudience = createMockToken({
        sub: 'auth0|123456',
        aud: 'https://wrong-audience.com',
        iss: `https://${mockAuth0Domain}/`,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await request(server)
        .get('/api/events')
        .set('Authorization', `Bearer ${tokenWithWrongAudience}`)
        .expect(401);
    });

    it('should reject tokens with incorrect issuer', async () => {
      const tokenWithWrongIssuer = createMockToken({
        sub: 'auth0|123456',
        aud: mockAudience,
        iss: 'https://wrong-issuer.com/',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await request(server)
        .get('/api/events')
        .set('Authorization', `Bearer ${tokenWithWrongIssuer}`)
        .expect(401);
    });

    it('should reject tokens that are not yet valid (nbf claim)', async () => {
      const futureToken = createMockToken({
        sub: 'auth0|123456',
        aud: mockAudience,
        iss: `https://${mockAuth0Domain}/`,
        exp: Math.floor(Date.now() / 1000) + 7200,
        nbf: Math.floor(Date.now() / 1000) + 3600, // Not valid for another hour
      });

      await request(server)
        .get('/api/events')
        .set('Authorization', `Bearer ${futureToken}`)
        .expect(401);
    });

    it('should handle malformed JWT tokens gracefully', async () => {
      await request(server)
        .get('/api/events')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401);
    });

    it('should handle empty JWT tokens', async () => {
      await request(server)
        .get('/api/events')
        .set('Authorization', 'Bearer ')
        .expect(401);
    });

    it('should reject tokens with tampered payload', async () => {
      const validToken = createMockToken({
        sub: 'auth0|123456',
        aud: mockAudience,
        iss: `https://${mockAuth0Domain}/`,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      // Tamper with the token by modifying the payload section
      const parts = validToken.split('.');
      const tamperedPayload = Buffer.from(JSON.stringify({
        sub: 'auth0|999999',
        aud: mockAudience,
        iss: `https://${mockAuth0Domain}/`,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      await request(server)
        .get('/api/events')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });
  });

  describe('Stripe Webhook Signature Validation', () => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';
    const webhookEndpoint = '/api/webhooks/stripe';

    /**
     * Helper function to generate Stripe webhook signature
     * Mimics Stripe's signature generation algorithm
     */
    const generateStripeSignature = (payload: string, secret: string, timestamp?: number): string => {
      const ts = timestamp || Math.floor(Date.now() / 1000);
      const signedPayload = `${ts}.${payload}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');
      
      return `t=${ts},v1=${signature}`;
    };

    const validWebhookPayload = {
      id: 'evt_test_webhook',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          object: 'checkout.session',
          amount_total: 5000,
          currency: 'usd',
          payment_status: 'paid',
        },
      },
    };

    it('should reject webhook requests without signature header', async () => {
      await request(server)
        .post(webhookEndpoint)
        .send(validWebhookPayload)
        .expect(400);
    });

    it('should reject webhook requests with invalid signature format', async () => {
      await request(server)
        .post(webhookEndpoint)
        .set('stripe-signature', 'invalid-signature-format')
        .send(validWebhookPayload)
        .expect(400);
    });

    it('should reject webhook requests with incorrect signature', async () => {
      const payload = JSON.stringify(validWebhookPayload);
      const wrongSignature = generateStripeSignature(payload, 'wrong-secret');

      await request(server)
        .post(webhookEndpoint)
        .set('stripe-signature', wrongSignature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(400);
    });

    it('should reject webhook requests with expired timestamp', async () => {
      const payload = JSON.stringify(validWebhookPayload);
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago (beyond tolerance)
      const signature =