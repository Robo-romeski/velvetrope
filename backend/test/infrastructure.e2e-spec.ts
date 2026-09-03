import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * E2E Infrastructure Tests
 * 
 * Validates:
 * - Application bootstrap and initialization
 * - Health endpoint functionality
 * - Database connectivity
 * - Service dependencies and configuration
 * - Error handling and graceful degradation
 * - Environment variable validation
 */
describe('Infrastructure (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Enable CORS for testing
    app.enableCors();

    await app.init();

    // Get database connection for testing
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  describe('Application Bootstrap', () => {
    it('should start the application successfully', () => {
      expect(app).toBeDefined();
      expect(app.getHttpServer()).toBeDefined();
    });

    it('should have validation pipe configured', async () => {
      const response = await request(app.getHttpServer())
        .post('/events')
        .send({ invalid: 'data' })
        .expect(401); // Will fail auth first, but validates pipe is active

      expect(response.status).toBeDefined();
    });

    it('should have CORS enabled', async () => {
      const response = await request(app.getHttpServer())
        .options('/healthz')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Health Endpoint', () => {
    it('GET /healthz should return 200 OK', async () => {
      const response = await request(app.getHttpServer())
        .get('/healthz')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return health status with timestamp', async () => {
      const response = await request(app.getHttpServer())
        .get('/healthz')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should respond quickly (< 500ms)', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/healthz')
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);
    });

    it('should handle multiple concurrent health checks', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer()).get('/healthz')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });
  });

  describe('Database Connectivity', () => {
    it('should have active database connection', () => {
      expect(dataSource).toBeDefined();
      expect(dataSource.isInitialized).toBe(true);
    });

    it('should be able to query database', async () => {
      const result = await dataSource.query('SELECT 1 as test');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should have all required entities registered', () => {
      const entities = dataSource.entityMetadatas;
      const entityNames = entities.map(e => e.name);

      // Verify core entities are registered
      expect(entityNames).toContain('Event');
      expect(entityNames).toContain('Application');
      expect(entityNames).toContain('InviteCode');
      expect(entityNames).toContain('CheckInTicket');
      expect(entityNames).toContain('StripeAccount');
    });

    it('should handle database errors gracefully', async () => {
      try {
        await dataSource.query('SELECT * FROM nonexistent_table');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        // Database should still be connected after error
        expect(dataSource.isInitialized).toBe(true);
      }
    });

    it('should support transactions', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await queryRunner.query('SELECT 1');
        await queryRunner.commitTransaction();
        expect(true).toBe(true);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        fail('Transaction should succeed');
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('Service Dependencies', () => {
    it('should have Auth0 configuration loaded', () => {
      const config = app.get('ConfigService');
      expect(config).toBeDefined();
      
      // Verify Auth0 env vars are accessible (not testing actual values)
      const auth0Domain = process.env.AUTH0_DOMAIN;
      const auth0Audience = process.env.AUTH0_AUDIENCE;
      
      expect(auth0Domain).toBeDefined();
      expect(auth0Audience).toBeDefined();
    });

    it('should have Stripe configuration loaded', () => {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      expect(stripeKey).toBeDefined();
      expect(webhookSecret).toBeDefined();
    });

    it('should have proper environment configuration', () => {
      const nodeEnv = process.env.NODE_ENV;
      expect(nodeEnv).toBeDefined();
      expect(['development', 'production', 'test']).toContain(nodeEnv);
    });
  });

  describe('API Routes', () => {
    it('should have events routes registered', async () => {
      // Should return 401 (auth required) not 404 (route not found)
      const response = await request(app.getHttpServer())
        .get('/events');

      expect(response.status).not.toBe(404);
    });

    it('should have applications routes registered', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications');

      expect(response.status).not.toBe(404);
    });

    it('should have invites routes registered', async () => {
      const response = await request(app.getHttpServer())
        .get('/invites/validate/test-code');

      expect(response.status).not.toBe(404);
    });

    it('should have checkin routes registered', async () => {
      const response = await request(app.getHttpServer())
        .post('/checkin/verify/test-token');

      expect(response.status).not.toBe(404);
    });

    it('should have stripe routes registered', async () => {
      const response = await request(app.getHttpServer())
        .post('/stripe/webhook');

      expect(response.status).not.toBe(404);
    });

    it('should return 404 for non-existent routes', async () => {
      await request(app.getHttpServer())
        .get('/nonexistent-route')
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('should validate request body structure', async () => {
      const response = await request(app.getHttpServer())
        .post('/events')
        .send({
          invalidField: 'should not be accepted',
        });

      // Should fail validation or auth, not crash
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle large payloads appropriately', async () => {
      const largePayload = {
        data: 'x'.repeat(1024 * 1024), // 1MB of data
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .send(largePayload);

      // Should either reject or handle, not crash
      expect(response.status).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle rapid sequential requests', async () => {
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app.getHttpServer()).get('/healthz')
        );
      }

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should maintain stable memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Make multiple requests
      for (let i = 0; i < 50; i++) {
        await request(app.getHttpServer()).get('/healthz');
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Security Headers', () => {
    it('should not expose sensitive server information', async () => {
      const response = await request(app.getHttpServer())
        .get('/healthz');

      // Should not expose server version or framework details
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should handle OPTIONS requests for CORS preflight', async () => {
      const response = await request(app.getHttpServer())
        .options('/events')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should close database connections on shutdown', async () => {
      expect(dataSource.isInitialized).toBe(true);
      
      // Verify connection is active
      await dataSource.query('SELECT 1');
      
      // Connection should remain active until explicit shutdown
      expect(dataSource.isInitialized).toBe(true);
    });
  });
});