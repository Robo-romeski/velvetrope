import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

describe('Infrastructure E2E Tests', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let httpServer: any;

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

    configService = app.get<ConfigService>(ConfigService);
    
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 OK on GET /health', async () => {
      const response = await request(httpServer)
        .get('/health')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return health status with uptime', async () => {
      const response = await request(httpServer)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should return health status with environment info', async () => {
      const response = await request(httpServer)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('environment');
      expect(['development', 'production', 'test']).toContain(
        response.body.environment,
      );
    });

    it('should return health status with service info', async () => {
      const response = await request(httpServer)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('service');
      expect(response.body.service).toBe('velvetkey-backend');
    });

    it('should respond quickly (< 100ms)', async () => {
      const startTime = Date.now();
      
      await request(httpServer)
        .get('/health')
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple concurrent health check requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(httpServer).get('/health'));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });

    it('should return correct content-type header', async () => {
      const response = await request(httpServer)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should not require authentication', async () => {
      const response = await request(httpServer)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('CORS Configuration', () => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3010',
    ];

    it('should include CORS headers for allowed origins', async () => {
      const response = await request(httpServer)
        .get('/health')
        .set('Origin', allowedOrigins[0])
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle preflight OPTIONS request', async () => {
      const response = await request(httpServer)
        .options('/health')
        .set('Origin', allowedOrigins[0])
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should allow credentials in CORS', async () => {
      const response = await request(httpServer)
        .get('/health')
        .set('Origin', allowedOrigins[0])
        .expect(200);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow common HTTP methods', async () => {
      const response = await request(httpServer)
        .options('/health')
        .set('Origin', allowedOrigins[0])
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('PUT');
      expect(allowedMethods).toContain('DELETE');
      expect(allowedMethods).toContain('PATCH');
    });

    it('should allow Authorization header', async () => {
      const response = await request(httpServer)
        .options('/health')
        .set('Origin', allowedOrigins[0])
        .set('Access-Control-Request-Headers', 'authorization')
        .expect(204);

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders.toLowerCase()).toContain('authorization');
    });

    it('should allow Content-Type header', async () => {
      const response = await request(httpServer)
        .options('/health')
        .set('Origin', allowedOrigins[0])
        .set('Access-Control-Request-Headers', 'content-type')
        .expect(204);

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders.toLowerCase()).toContain('content-type');
    });

    it('should set appropriate max-age for preflight cache', async () => {
      const response = await request(httpServer)
        .options('/health')
        .set('Origin', allowedOrigins[0])
        .expect(204);

      expect(response.headers['access-control-max-age']).toBeDefined();
      const maxAge = parseInt(response.headers['access-control-max-age'], 10);
      expect(maxAge).toBeGreaterThan(0);
    });

    it('should handle requests without Origin header', async () => {
      const response = await request(httpServer)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('Port Accessibility', () => {
    it('should be accessible on configured port', async () => {
      const port = configService.get<number>('PORT') || 3010;
      const address = httpServer.address();

      expect(address).toBeDefined();
      expect(address.port).toBe(port);
    });

    it('should accept HTTP connections', async () => {
      const response = await request(httpServer)
        .get('/health')
        .expect(200);

      expect(response.status).toBe(200);
    });

    it('should handle multiple simultaneous connections', async () => {
      const requests = Array(20)
        .fill(null)
        .map((_, index) =>
          request(httpServer)
            .get('/health')
            .set('X-Request-ID', `test-${index}`),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should respond to requests on root path', async () => {
      await request(httpServer)
        .get('/')
        .expect((res) => {
          // Should either return 200 or 404, but not connection error
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should handle keep-alive connections', async () => {
      const agent = request.agent(httpServer);

      const response1 = await agent.get('/health').expect(200);
      const response2 = await agent.get('/health').expect(200);

      expect(response1.body.status).toBe('ok');
      expect(response2.body.status).toBe('ok');
    });
  });

  describe('Auth0 JWT Verification Setup', () => {
    const mockAuth0Domain = 'test-domain.auth0.com';
    const mockAudience = 'https://api.velvetkey.com';

    beforeEach(() => {
      // Mock environment variables for Auth0
      process.env.AUTH0_DOMAIN = mockAuth0Domain;
      process.env.AUTH0_AUDIENCE = mockAudience;
    });

    it('should reject requests without Authorization header to protected routes', async () => {
      await request(httpServer)
        .get('/api/users/profile')
        .expect(401);
    });

    it('should reject requests with malformed Authorization header', async () => {
      await request(httpServer)
        .get('/api/users/profile')
        .set('Authorization', 'InvalidToken')
        .expect(401);
    });

    it('should reject requests with Bearer token without proper format', async () => {
      await request(httpServer)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer')
        .expect(401);
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        {
          sub: 'auth0|123456',
          aud: mockAudience,
          iss: `https://${mockAuth0Domain}/`,
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
        'test-secret',
      );

      await request(httpServer)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject JWT with invalid audience', async () => {
      const invalidAudienceToken = jwt.sign(
        {
          sub: 'auth0|123456',
          aud: 'https://wrong-audience.com',
          iss: `https://${mockAuth0Domain}/`,
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        'test-secret',
      );

      await request(httpServer)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${invalidAudienceToken}`)
        .expect(401);
    });

    it('should reject JWT with invalid issuer', async () => {
      const invalidIssuerToken = jwt.sign(
        {
          sub: 'auth0|123456',
          aud: mockAudience,
          iss: 'https://wrong-issuer.auth0.com/',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        'test-secret',
      );

      await request(httpServer)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${invalidIssuerToken}`)
        .expect(401);
    });

    it('should reject JWT without required claims', async () => {
      const incompleteToken = jwt.sign(
        {
          sub: 'auth0|123456',
          // Missing aud, iss, exp
        },
        'test-secret',
      );

      await request(httpServer)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${incompleteToken}`)
        .expect(401);
    });

    it('should reject JWT with invalid signature', async () => {
      const tokenWithInvalidSignature = jwt.sign(
        {
          sub: 'auth0|123456',
          aud: mockAudience,
          iss: `https://${mockAuth0Domain}/`,
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        'wrong-secret',
      );

      await request(httpServer)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokenWithInvalidSignature}`)
        .expect(401);
    });

    it('should handle malformed JWT tokens gracefully', async () => {
      await request(httpServer)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer not.a.valid.jwt.token')
        .expect(401);
    });

    it('should validate Auth0 configuration is present', () => {
      const auth0Domain = configService.get<string>('AUTH0_DOMAIN');
      const auth0Audience = configService.get<string>('AUTH0_AUDIENCE');

      // In test environment, these might be mocked or undefined
      // Just verify the config service can access them
      expect(auth0Domain).toBeDefined();
      expect(auth0Audience).toBeDefined();
    });

    it('should handle concurrent authentication requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(httpServer)
            .get('/api/users/profile')
            .set('Authorization', 'Bearer invalid-token'),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(401);
      });
    });
  });

  describe('Global Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(httpServer)
        .get('/non-existent-route')
        .expect(404);
    });

    it('should return proper error format for 404', async () => {
      const response = await request(httpServer)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle invalid JSON in request body', async () => {
      await request(httpServer)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should return proper content-type for errors', async () => {
      const response = await request(httpServer)
        .get('/non-existent-route')
        .expect(404);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle large request bodies appropriately', async () => {
      const largePayload = {
        data: 'x'.repeat(10 * 1024 * 1024), // 10MB
      };

      await request(httpServer)
        .post('/api/users')
        .send(largePayload)
        .expect((res) => {
          // Should either reject (413) or handle based on configuration
          expect([400, 401, 413]).toContain(res.status);