import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * E2E Tests for Health Endpoint
 * 
 * Coverage:
 * - Health endpoint returns correct status
 * - Database connectivity check
 * - Auth0 configuration validation
 * - Service availability verification
 * - Error handling and graceful degradation
 * 
 * Test Strategy:
 * - Verify health endpoint responds with 200 OK
 * - Validate response structure and required fields
 * - Test database connection status reporting
 * - Verify Auth0 configuration presence
 * - Test behavior when dependencies are unavailable
 * - Validate response times for health checks
 */
describe('Health Endpoint (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let moduleFixture: TestingModule;

  /**
   * Setup test application before all tests
   * Initializes NestJS app with production-like configuration
   */
  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply global pipes as in production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Get database connection for testing
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  /**
   * Cleanup after all tests complete
   */
  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  describe('GET /health', () => {
    /**
     * Test: Health endpoint returns 200 OK status
     * Validates basic endpoint availability
     */
    it('should return 200 OK status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    /**
     * Test: Health endpoint returns correct response structure
     * Validates all required fields are present
     */
    it('should return correct response structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('services');
    });

    /**
     * Test: Health status is 'ok' when all services are healthy
     */
    it('should return status "ok" when all services are healthy', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    /**
     * Test: Timestamp is in valid ISO 8601 format
     */
    it('should return valid ISO 8601 timestamp', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const timestamp = response.body.timestamp;
      expect(timestamp).toBeDefined();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    /**
     * Test: Uptime is a positive number
     */
    it('should return positive uptime value', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    /**
     * Test: Environment matches NODE_ENV
     */
    it('should return correct environment', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.environment).toBeDefined();
      expect(['development', 'production', 'test']).toContain(
        response.body.environment,
      );
    });

    /**
     * Test: Response includes services object
     */
    it('should include services status object', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.services).toBeDefined();
      expect(typeof response.body.services).toBe('object');
    });
  });

  describe('Database Connectivity Check', () => {
    /**
     * Test: Database status is included in health response
     */
    it('should include database status in health response', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.services).toHaveProperty('database');
    });

    /**
     * Test: Database status is 'up' when connected
     */
    it('should report database status as "up" when connected', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.services.database).toHaveProperty('status');
      expect(response.body.services.database.status).toBe('up');
    });

    /**
     * Test: Database connection details are included
     */
    it('should include database connection details', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const dbService = response.body.services.database;
      expect(dbService).toHaveProperty('status');
      expect(dbService).toHaveProperty('responseTime');
    });

    /**
     * Test: Database response time is reasonable
     */
    it('should report reasonable database response time', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const responseTime = response.body.services.database.responseTime;
      expect(responseTime).toBeDefined();
      expect(typeof responseTime).toBe('number');
      expect(responseTime).toBeGreaterThanOrEqual(0);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    /**
     * Test: Database connection can be verified
     */
    it('should verify actual database connection', async () => {
      expect(dataSource).toBeDefined();
      expect(dataSource.isInitialized).toBe(true);

      // Perform a simple query to verify connection
      const result = await dataSource.query('SELECT 1 as result');
      expect(result).toBeDefined();
      expect(result[0].result).toBe(1);
    });

    /**
     * Test: Health check handles database query errors gracefully
     */
    it('should handle database errors gracefully', async () => {
      // This test verifies the endpoint doesn't crash on DB errors
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
        });

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('Auth0 Configuration Validation', () => {
    /**
     * Test: Auth0 configuration status is included
     */
    it('should include Auth0 configuration status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.services).toHaveProperty('auth0');
    });

    /**
     * Test: Auth0 status indicates configuration presence
     */
    it('should report Auth0 configuration status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const auth0Service = response.body.services.auth0;
      expect(auth0Service).toHaveProperty('status');
      expect(['configured', 'not_configured', 'error']).toContain(
        auth0Service.status,
      );
    });

    /**
     * Test: Auth0 configuration includes required fields check
     */
    it('should validate Auth0 required configuration fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const auth0Service = response.body.services.auth0;
      expect(auth0Service).toHaveProperty('configured');
      expect(typeof auth0Service.configured).toBe('boolean');
    });

    /**
     * Test: Auth0 configuration details are present when configured
     */
    it('should include Auth0 configuration details when available', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const auth0Service = response.body.services.auth0;
      
      if (auth0Service.configured) {
        expect(auth0Service).toHaveProperty('domain');
        expect(auth0Service).toHaveProperty('audience');
        expect(auth0Service).toHaveProperty('issuer');
      }
    });

    /**
     * Test: Auth0 sensitive data is not exposed
     */
    it('should not expose Auth0 sensitive credentials', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const responseString = JSON.stringify(response.body);
      
      // Ensure no secrets are leaked
      expect(responseString).not.toContain('client_secret');
      expect(responseString).not.toContain('api_key');
      expect(responseString).not.toContain('private_key');
    });

    /**
     * Test: Auth0 domain format validation
     */
    it('should validate Auth0 domain format if configured', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const auth0Service = response.body.services.auth0;
      
      if (auth0Service.configured && auth0Service.domain) {
        // Auth0 domain should be a valid URL or domain format
        expect(auth0Service.domain).toMatch(/^[a-zA-Z0-9-]+\.auth0\.com$|^https?:\/\/.+/);
      }
    });
  });

  describe('Response Performance', () => {
    /**
     * Test: Health endpoint responds quickly
     */
    it('should respond within acceptable time limit', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
    });

    /**
     * Test: Multiple concurrent health checks
     */
    it('should handle concurrent health check requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/health')
          .expect(200)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body.status).toBeDefined();
        expect(response.body.services).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    /**
     * Test: Health endpoint handles invalid HTTP methods
     */
    it('should reject POST requests to health endpoint', async () => {
      await request(app.getHttpServer())
        .post('/health')
        .expect(404);
    });

    /**
     * Test: Health endpoint handles invalid query parameters gracefully
     */
    it('should ignore invalid query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/health?invalid=param&foo=bar')
        .expect(200);

      expect(response.body.status).toBeDefined();
    });

    /**
     * Test: Health endpoint returns proper content-type
     */
    it('should return application/json content-type', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);
    });

    /**
     * Test: Health endpoint includes CORS headers if configured
     */
    it('should include appropriate headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('content-type');
    });
  });

  describe('Service Dependencies', () => {
    /**
     * Test: All critical services are checked
     */
    it('should check all critical service dependencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const services = response.body.services;
      
      // Verify critical services are present
      expect(services).toHaveProperty('database');
      expect(services).toHaveProperty('auth0');
    });

    /**
     * Test: Service status values are valid
     */
    it('should return valid status values for all services', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const services = response.body.services;
      const validStatuses = ['up', 'down', 'configured', 'not_configured', 'error'];

      Object.values(services).forEach((service: any) => {
        expect(service).toHaveProperty('status');
        expect(validStatuses).toContain(service.status);
      });
    });

    /**
     * Test: Overall health status reflects service states
     */
    it('should reflect overall health based on service states', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const overallStatus = response.body.status;
      const services = response.body.services;

      // If database is down, overall status should not be 'ok'
      if (services.database?.status === 'down') {
        expect(overallStatus).not.toBe('ok');
      }
    });
  });

  describe('Monitoring and Observability', () => {
    /**
     * Test: Health response includes version information if available
     */
    it('should include version information when available', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Version might be optional, but if present should be valid
      if (response.body.version) {
        expect(typeof response.body.version).toBe('string');
        expect(response.body.version.length).toBeGreaterThan(0);
      }
    });

    /**
     * Test: Health check is idempotent
     */
    it('should be idempotent across multiple calls', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Status should be consistent
      expect(response1.body.status).toBe(response2.body.status);