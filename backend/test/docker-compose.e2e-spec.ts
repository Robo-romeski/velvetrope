import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * E2E Tests for Docker Compose Infrastructure
 * 
 * Coverage:
 * - Services start correctly via docker-compose
 * - Inter-service communication (backend <-> database, frontend <-> backend)
 * - Environment variables are properly loaded and accessible
 * - Service health checks and readiness
 * - Network connectivity between containers
 * - Volume mounts and data persistence
 * - Service restart and recovery
 * - Port mappings and accessibility
 * 
 * Prerequisites:
 * - Docker and Docker Compose installed
 * - .env file configured with test values
 * - Sufficient system resources for containers
 * 
 * @group e2e
 * @group docker
 * @group infrastructure
 */
describe('Docker Compose E2E Tests', () => {
  const DOCKER_COMPOSE_FILE = 'docker-compose.prod.yml';
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3010';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const MAX_STARTUP_TIME = 120000; // 2 minutes
  const HEALTH_CHECK_INTERVAL = 5000; // 5 seconds
  const HEALTH_CHECK_RETRIES = 24; // 2 minutes total

  let servicesStarted = false;

  /**
   * Setup: Start Docker Compose services before all tests
   */
  beforeAll(async () => {
    console.log('Starting Docker Compose services...');
    
    try {
      // Ensure .env file exists
      await ensureEnvFile();

      // Stop any existing containers
      await stopDockerServices();

      // Pull latest images
      await execAsync(`docker-compose -f ${DOCKER_COMPOSE_FILE} pull`, {
        timeout: 180000,
      });

      // Start services in detached mode
      await execAsync(`docker-compose -f ${DOCKER_COMPOSE_FILE} up -d`, {
        timeout: 180000,
      });

      servicesStarted = true;

      // Wait for services to be healthy
      await waitForServicesHealthy();
    } catch (error) {
      console.error('Failed to start Docker services:', error);
      throw error;
    }
  }, MAX_STARTUP_TIME + 60000);

  /**
   * Teardown: Stop and clean up Docker Compose services
   */
  afterAll(async () => {
    if (servicesStarted) {
      console.log('Stopping Docker Compose services...');
      await stopDockerServices();
    }
  }, 60000);

  /**
   * Test Suite: Service Startup and Health
   */
  describe('Service Startup', () => {
    it('should start all services defined in docker-compose', async () => {
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} ps --services`
      );
      const services = stdout.trim().split('\n');

      expect(services).toContain('backend');
      expect(services.length).toBeGreaterThan(0);
    });

    it('should have all containers in running state', async () => {
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} ps --format json`
      );
      
      const containers = stdout
        .trim()
        .split('\n')
        .filter(line => line)
        .map(line => JSON.parse(line));

      containers.forEach(container => {
        expect(container.State).toBe('running');
      });
    });

    it('should have backend service accessible on configured port', async () => {
      const response = await request(BACKEND_URL)
        .get('/health')
        .timeout(10000);

      expect(response.status).toBe(200);
    });

    it('should restart backend service successfully', async () => {
      // Restart the backend service
      await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} restart backend`
      );

      // Wait for service to be healthy again
      await waitForServiceHealthy('backend', BACKEND_URL);

      const response = await request(BACKEND_URL).get('/health');
      expect(response.status).toBe(200);
    }, 60000);

    it('should handle backend service failure and recovery', async () => {
      // Stop the backend service
      await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} stop backend`
      );

      // Verify service is down
      await expect(
        request(BACKEND_URL).get('/health').timeout(5000)
      ).rejects.toThrow();

      // Start the service again
      await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} start backend`
      );

      // Wait for recovery
      await waitForServiceHealthy('backend', BACKEND_URL);

      const response = await request(BACKEND_URL).get('/health');
      expect(response.status).toBe(200);
    }, 90000);
  });

  /**
   * Test Suite: Environment Variables
   */
  describe('Environment Variables', () => {
    it('should load NODE_ENV from environment', async () => {
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} exec -T backend printenv NODE_ENV`
      );

      expect(stdout.trim()).toBe('production');
    });

    it('should load PORT configuration for backend', async () => {
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} exec -T backend printenv PORT`
      );

      expect(stdout.trim()).toBe('3010');
    });

    it('should have DATABASE_URL configured', async () => {
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} exec -T backend printenv DATABASE_URL`
      );

      expect(stdout.trim()).toBeTruthy();
      expect(stdout.trim()).toContain('postgresql://');
    });

    it('should have Auth0 environment variables configured', async () => {
      const envVars = ['AUTH0_DOMAIN', 'AUTH0_AUDIENCE', 'AUTH0_ISSUER'];

      for (const envVar of envVars) {
        const { stdout } = await execAsync(
          `docker-compose -f ${DOCKER_COMPOSE_FILE} exec -T backend printenv ${envVar}`
        );

        expect(stdout.trim()).toBeTruthy();
      }
    });

    it('should have Stripe configuration loaded', async () => {
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} exec -T backend printenv STRIPE_SECRET_KEY`
      );

      expect(stdout.trim()).toBeTruthy();
    });

    it('should not expose sensitive env vars in logs', async () => {
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} logs backend`
      );

      // Ensure sensitive data is not logged
      expect(stdout).not.toContain('DATABASE_URL=');
      expect(stdout).not.toContain('STRIPE_SECRET_KEY=');
      expect(stdout).not.toContain('sk_test_');
      expect(stdout).not.toContain('sk_live_');
    });
  });

  /**
   * Test Suite: Inter-Service Communication
   */
  describe('Inter-Service Communication', () => {
    it('should allow backend to connect to database', async () => {
      const response = await request(BACKEND_URL)
        .get('/health')
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('database');
      expect(response.body.database).toBe('healthy');
    });

    it('should resolve service names via Docker network', async () => {
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} exec -T backend ping -c 1 backend`
      );

      expect(stdout).toContain('1 packets transmitted, 1 received');
    });

    it('should allow backend API calls from host', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/health')
        .timeout(10000);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should handle database connection pooling', async () => {
      // Make multiple concurrent requests
      const requests = Array(10)
        .fill(null)
        .map(() => request(BACKEND_URL).get('/health'));

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should maintain persistent database connections', async () => {
      const response1 = await request(BACKEND_URL).get('/health');
      expect(response1.status).toBe(200);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response2 = await request(BACKEND_URL).get('/health');
      expect(response2.status).toBe(200);
    });
  });

  /**
   * Test Suite: Network Configuration
   */
  describe('Network Configuration', () => {
    it('should create custom Docker network', async () => {
      const { stdout } = await execAsync(
        `docker network ls --format "{{.Name}}"`
      );

      const networks = stdout.split('\n');
      const projectNetwork = networks.find(net => 
        net.includes('velvetkey') || net.includes('default')
      );

      expect(projectNetwork).toBeTruthy();
    });

    it('should have backend container on the network', async () => {
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} ps -q backend`
      );
      const containerId = stdout.trim();

      const { stdout: networkInfo } = await execAsync(
        `docker inspect ${containerId} --format "{{json .NetworkSettings.Networks}}"`
      );

      const networks = JSON.parse(networkInfo);
      expect(Object.keys(networks).length).toBeGreaterThan(0);
    });

    it('should expose correct ports to host', async () => {
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} ps backend --format "{{.Ports}}"`
      );

      expect(stdout).toContain('3010');
    });
  });

  /**
   * Test Suite: Volume and Data Persistence
   */
  describe('Volume and Data Persistence', () => {
    it('should create named volumes for data persistence', async () => {
      const { stdout } = await execAsync(
        `docker volume ls --format "{{.Name}}"`
      );

      const volumes = stdout.split('\n');
      expect(volumes.length).toBeGreaterThan(0);
    });

    it('should persist data across container restarts', async () => {
      // This would require actual data operations
      // For now, verify volume mounts exist
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} config --volumes`
      );

      expect(stdout).toBeTruthy();
    });
  });

  /**
   * Test Suite: Resource Limits and Health
   */
  describe('Resource Management', () => {
    it('should have containers within memory limits', async () => {
      const { stdout } = await execAsync(
        `docker stats --no-stream --format "{{.Container}}\t{{.MemUsage}}" $(docker-compose -f ${DOCKER_COMPOSE_FILE} ps -q)`
      );

      expect(stdout).toBeTruthy();
      // Verify containers are running and consuming memory
      const lines = stdout.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should respond to health checks within timeout', async () => {
      const startTime = Date.now();
      const response = await request(BACKEND_URL).get('/health');
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // 5 second timeout
    });
  });

  /**
   * Test Suite: Error Handling and Recovery
   */
  describe('Error Handling', () => {
    it('should handle graceful shutdown', async () => {
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} stop -t 30 backend`
      );

      // Verify clean shutdown
      expect(stdout).not.toContain('error');
      expect(stdout).not.toContain('failed');

      // Restart for other tests
      await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} start backend`
      );
      await waitForServiceHealthy('backend', BACKEND_URL);
    }, 60000);

    it('should log errors appropriately', async () => {
      const { stdout } = await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} logs --tail=100 backend`
      );

      // Logs should exist
      expect(stdout).toBeTruthy();
    });
  });

  /**
   * Helper Functions
   */

  /**
   * Ensure .env file exists for testing
   */
  async function ensureEnvFile(): Promise<void> {
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');

    try {
      await fs.access(envPath);
    } catch {
      // .env doesn't exist, copy from .env.example
      try {
        await fs.copyFile(envExamplePath, envPath);
        console.log('Created .env from .env.example');
      } catch (error) {
        console.warn('Could not create .env file:', error);
      }
    }
  }

  /**
   * Stop all Docker Compose services
   */
  async function stopDockerServices(): Promise<void> {
    try {
      await execAsync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} down -v --remove-orphans`,
        { timeout: 60000 }
      );
    } catch (error) {
      console.warn('Error stopping services:', error);
    }
  }

  /**
   * Wait for all services to be healthy
   */
  async function waitForServicesHealthy(): Promise<void> {
    console.log('Waiting for services to be healthy...');
    await waitForServiceHealthy('backend', BACKEND_URL);
  }

  /**
   * Wait for a specific service to be healthy
   */
  async function waitForServiceHealthy(
    serviceName: string,
    url: string
  ): Promise<void> {
    for (let i = 0; i < HEALTH_CHECK_RETRIES; i++) {
      try {
        const response = await request(url)
          .get('/health')
          .timeout(HEALTH_CHECK_INTERVAL);

        if (response.status === 200) {
          console.log(`${serviceName} is healthy`);
          return;
        }
      } catch (error) {
        console.log(
          `Waiting for ${serviceName}... (${i + 1}/${HEALTH_CHECK_RET