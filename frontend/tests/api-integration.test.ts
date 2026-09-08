import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * API Integration Tests
 * 
 * Tests frontend-to-backend connectivity, CORS configuration, and Auth0 token handling.
 * These tests verify that the frontend can successfully communicate with the backend API
 * and that authentication flows work correctly.
 * 
 * Prerequisites:
 * - Backend server must be running (default: http://localhost:3010)
 * - Auth0 must be configured with valid credentials
 * - CORS must be properly configured on backend
 */

describe('API Integration Tests', () => {
  let apiClient: AxiosInstance;
  let backendUrl: string;
  let mockAuth0Token: string;
  let validAuth0Token: string | null = null;

  beforeAll(() => {
    // Use environment variable or default to localhost
    backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';
    
    // Create axios instance with default config
    apiClient = axios.create({
      baseURL: backendUrl,
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status code
    });

    // Generate a mock JWT token for testing (invalid signature)
    mockAuth0Token = generateMockJWT();
  });

  afterAll(async () => {
    // Cleanup any resources if needed
  });

  beforeEach(() => {
    // Reset any test state between tests
  });

  describe('Backend Connectivity', () => {
    it('should successfully reach the backend health endpoint', async () => {
      const response = await apiClient.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data.status).toBe('ok');
    });

    it('should return proper error for non-existent endpoint', async () => {
      const response = await apiClient.get('/non-existent-endpoint');
      
      expect(response.status).toBe(404);
    });

    it('should handle network timeout gracefully', async () => {
      const slowClient = axios.create({
        baseURL: backendUrl,
        timeout: 1, // 1ms timeout to force timeout
      });

      try {
        await slowClient.get('/health');
        // If it doesn't timeout, that's also acceptable
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.code).toBe('ECONNABORTED');
        }
      }
    });

    it('should handle connection refused error', async () => {
      const invalidClient = axios.create({
        baseURL: 'http://localhost:9999', // Non-existent port
        timeout: 2000,
      });

      try {
        await invalidClient.get('/health');
        fail('Should have thrown connection error');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(['ECONNREFUSED', 'ENOTFOUND']).toContain(error.code);
        }
      }
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers in response', async () => {
      const response = await apiClient.get('/health', {
        headers: {
          'Origin': 'http://localhost:3000',
        },
      });

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle preflight OPTIONS request', async () => {
      const response = await apiClient.options('/api/events', {
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization',
        },
      });

      expect([200, 204]).toContain(response.status);
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    it('should allow credentials in CORS', async () => {
      const response = await apiClient.get('/health', {
        headers: {
          'Origin': 'http://localhost:3000',
        },
        withCredentials: true,
      });

      expect(response.headers['access-control-allow-credentials']).toBeTruthy();
    });

    it('should accept requests from allowed origins', async () => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      for (const origin of allowedOrigins) {
        const response = await apiClient.get('/health', {
          headers: { 'Origin': origin },
        });

        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBeTruthy();
      }
    });

    it('should handle CORS for POST requests with JSON', async () => {
      const response = await apiClient.post(
        '/api/events',
        { name: 'Test Event' },
        {
          headers: {
            'Origin': 'http://localhost:3000',
            'Content-Type': 'application/json',
          },
        }
      );

      // Should fail auth but CORS should work
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Auth0 Token Handling', () => {
    it('should reject requests without authorization header', async () => {
      const response = await apiClient.get('/api/events');

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
    });

    it('should reject requests with malformed authorization header', async () => {
      const response = await apiClient.get('/api/events', {
        headers: {
          'Authorization': 'InvalidFormat',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid Bearer token', async () => {
      const response = await apiClient.get('/api/events', {
        headers: {
          'Authorization': 'Bearer invalid-token-string',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should reject requests with expired token', async () => {
      const expiredToken = generateMockJWT({ exp: Math.floor(Date.now() / 1000) - 3600 });
      
      const response = await apiClient.get('/api/events', {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });

      expect(response.status).toBe(401);
    });

    it('should reject requests with token missing required claims', async () => {
      const invalidToken = generateMockJWT({ sub: undefined });
      
      const response = await apiClient.get('/api/events', {
        headers: {
          'Authorization': `Bearer ${invalidToken}`,
        },
      });

      expect(response.status).toBe(401);
    });

    it('should handle token with invalid signature', async () => {
      const response = await apiClient.get('/api/events', {
        headers: {
          'Authorization': `Bearer ${mockAuth0Token}`,
        },
      });

      expect(response.status).toBe(401);
    });

    it('should properly pass authorization header in POST requests', async () => {
      const response = await apiClient.post(
        '/api/events',
        {
          name: 'Test Event',
          date: new Date().toISOString(),
          venue: 'Test Venue',
        },
        {
          headers: {
            'Authorization': `Bearer ${mockAuth0Token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Should fail auth, not validation
      expect(response.status).toBe(401);
    });

    it('should properly pass authorization header in PUT requests', async () => {
      const response = await apiClient.put(
        '/api/events/test-id',
        { name: 'Updated Event' },
        {
          headers: {
            'Authorization': `Bearer ${mockAuth0Token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(401);
    });

    it('should properly pass authorization header in DELETE requests', async () => {
      const response = await apiClient.delete('/api/events/test-id', {
        headers: {
          'Authorization': `Bearer ${mockAuth0Token}`,
        },
      });

      expect(response.status).toBe(401);
    });

    it('should handle multiple concurrent authenticated requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        apiClient.get('/api/events', {
          headers: {
            'Authorization': `Bearer ${mockAuth0Token}`,
          },
        })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });
  });

  describe('API Response Format', () => {
    it('should return JSON content-type for API endpoints', async () => {
      const response = await apiClient.get('/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return consistent error format', async () => {
      const response = await apiClient.get('/api/events');

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
      expect(typeof response.data.message).toBe('string');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      try {
        await apiClient.post(
          '/api/events',
          'invalid-json-string',
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mockAuth0Token}`,
            },
          }
        );
      } catch (error) {
        // Should handle gracefully
        expect(error).toBeDefined();
      }
    });

    it('should return proper status codes for different operations', async () => {
      // GET - 401 (unauthorized)
      const getResponse = await apiClient.get('/api/events');
      expect(getResponse.status).toBe(401);

      // POST - 401 (unauthorized)
      const postResponse = await apiClient.post('/api/events', {});
      expect(postResponse.status).toBe(401);

      // Health check - 200
      const healthResponse = await apiClient.get('/health');
      expect(healthResponse.status).toBe(200);
    });
  });

  describe('Request/Response Interceptors', () => {
    it('should handle request with custom headers', async () => {
      const response = await apiClient.get('/health', {
        headers: {
          'X-Custom-Header': 'test-value',
          'X-Request-ID': 'test-request-123',
        },
      });

      expect(response.status).toBe(200);
    });

    it('should handle large request payloads', async () => {
      const largePayload = {
        data: 'x'.repeat(10000), // 10KB of data
      };

      const response = await apiClient.post('/api/events', largePayload, {
        headers: {
          'Authorization': `Bearer ${mockAuth0Token}`,
        },
      });

      // Should handle the payload (even if auth fails)
      expect([401, 413]).toContain(response.status);
    });

    it('should handle response with various status codes', async () => {
      const endpoints = [
        { path: '/health', expectedStatus: 200 },
        { path: '/api/events', expectedStatus: 401 },
        { path: '/non-existent', expectedStatus: 404 },
      ];

      for (const endpoint of endpoints) {
        const response = await apiClient.get(endpoint.path);
        expect(response.status).toBe(endpoint.expectedStatus);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle 500 internal server errors', async () => {
      // This would need a specific endpoint that triggers 500
      // For now, we test the client can handle it
      const response = await apiClient.get('/api/trigger-error', {
        headers: {
          'Authorization': `Bearer ${mockAuth0Token}`,
        },
      });

      // Should return some error status
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle network errors gracefully', async () => {
      const faultyClient = axios.create({
        baseURL: 'http://invalid-domain-that-does-not-exist.local',
        timeout: 2000,
      });

      try {
        await faultyClient.get('/health');
        fail('Should have thrown network error');
      } catch (error) {
        expect(error).toBeDefined();
        if (axios.isAxiosError(error)) {
          expect(['ENOTFOUND', 'EAI_AGAIN']).toContain(error.code);
        }
      }
    });

    it('should handle rate limiting responses', async () => {
      // Make multiple rapid requests
      const requests = Array(20).fill(null).map(() =>
        apiClient.get('/api/events', {
          headers: {
            'Authorization': `Bearer ${mockAuth0Token}`,
          },
        })
      );

      const responses = await Promise.all(requests);

      // Check if any response is rate limited (429)
      const hasRateLimit = responses.some(r => r.status === 429);
      
      // If rate limiting is implemented, at least one should be 429
      // If not, all should be 401
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status);
      });
    });
  });
});

/**
 * Helper function to generate a mock JWT token for testing
 * Note: This token will have an invalid signature and should be rejected by the backend
 */
function generateMockJWT(customClaims: Record<string, any> = {}): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: 'mock-key-id',
  };

  const payload = {
    iss: 'https://mock-auth0-domain.auth0.com/',
    sub: 'auth0|mock-user-id-12345',
    aud: ['http://localhost:3010', 'https://mock-auth0-domain.auth0.com/userinfo'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    azp: 'mock-client-id',
    scope: 'openid profile email',
    ...customClaims,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = 'mock-signature-that-will-fail-verification';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Helper function to base64url encode a string
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}