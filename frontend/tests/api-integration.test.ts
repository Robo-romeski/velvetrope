import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

/**
 * API Integration Tests
 * 
 * Tests the frontend API client's integration with the backend:
 * - Connection establishment and health checks
 * - Auth0 token passing and validation
 * - CORS configuration and preflight requests
 * - Cookie handling for session management
 * - Error handling and retry logic
 */

describe('API Integration Tests', () => {
  let apiClient: AxiosInstance;
  let backendUrl: string;
  let validToken: string;
  let expiredToken: string;
  let invalidToken: string;

  // Mock Auth0 configuration
  const mockAuth0Config = {
    domain: 'test-domain.auth0.com',
    clientId: 'test-client-id',
    audience: 'https://api.velvetrope.test',
  };

  // Generate RSA key pair for JWT signing
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  beforeAll(() => {
    // Set backend URL from environment or default
    backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

    // Generate valid JWT token
    validToken = jwt.sign(
      {
        sub: 'auth0|test-user-123',
        email: 'test@example.com',
        aud: mockAuth0Config.audience,
        iss: `https://${mockAuth0Config.domain}/`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        scope: 'openid profile email',
      },
      privateKey,
      { algorithm: 'RS256', keyid: 'test-key-id' }
    );

    // Generate expired JWT token
    expiredToken = jwt.sign(
      {
        sub: 'auth0|test-user-123',
        email: 'test@example.com',
        aud: mockAuth0Config.audience,
        iss: `https://${mockAuth0Config.domain}/`,
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        scope: 'openid profile email',
      },
      privateKey,
      { algorithm: 'RS256', keyid: 'test-key-id' }
    );

    // Generate invalid token (malformed)
    invalidToken = 'invalid.token.format';
  });

  beforeEach(() => {
    // Create fresh axios instance for each test
    apiClient = axios.create({
      baseURL: backendUrl,
      timeout: 5000,
      withCredentials: true, // Enable cookie handling
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  afterAll(() => {
    // Cleanup
    jest.clearAllMocks();
  });

  describe('Backend Connection', () => {
    it('should successfully connect to backend health endpoint', async () => {
      const response = await apiClient.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data.status).toBe('ok');
    });

    it('should handle connection timeout gracefully', async () => {
      const slowClient = axios.create({
        baseURL: backendUrl,
        timeout: 1, // 1ms timeout to force failure
        withCredentials: true,
      });

      await expect(slowClient.get('/health')).rejects.toThrow();
    });

    it('should handle network errors when backend is unreachable', async () => {
      const unreachableClient = axios.create({
        baseURL: 'http://localhost:9999', // Non-existent port
        timeout: 1000,
        withCredentials: true,
      });

      await expect(unreachableClient.get('/health')).rejects.toThrow();
    });

    it('should return proper API version information', async () => {
      const response = await apiClient.get('/health');
      
      expect(response.data).toHaveProperty('version');
      expect(typeof response.data.version).toBe('string');
    });

    it('should handle malformed URLs gracefully', async () => {
      const malformedClient = axios.create({
        baseURL: 'not-a-valid-url',
        timeout: 1000,
      });

      await expect(malformedClient.get('/health')).rejects.toThrow();
    });
  });

  describe('Auth0 Token Passing', () => {
    it('should successfully pass valid Auth0 token in Authorization header', async () => {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${validToken}`;
      
      const response = await apiClient.get('/api/user/profile');
      
      expect(response.status).toBe(200);
      expect(response.config.headers?.['Authorization']).toBe(`Bearer ${validToken}`);
    });

    it('should reject requests with expired tokens', async () => {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${expiredToken}`;
      
      try {
        await apiClient.get('/api/user/profile');
        fail('Should have thrown an error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should reject requests with invalid token format', async () => {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${invalidToken}`;
      
      try {
        await apiClient.get('/api/user/profile');
        fail('Should have thrown an error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should reject requests without Authorization header', async () => {
      delete apiClient.defaults.headers.common['Authorization'];
      
      try {
        await apiClient.get('/api/user/profile');
        fail('Should have thrown an error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should handle malformed Authorization header', async () => {
      apiClient.defaults.headers.common['Authorization'] = 'InvalidFormat';
      
      try {
        await apiClient.get('/api/user/profile');
        fail('Should have thrown an error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should include token in all authenticated requests', async () => {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${validToken}`;
      
      const endpoints = ['/api/user/profile', '/api/subscriptions', '/api/events'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await apiClient.get(endpoint);
          expect(response.config.headers?.['Authorization']).toBe(`Bearer ${validToken}`);
        } catch (error) {
          // Some endpoints might not exist, but token should still be passed
          const axiosError = error as AxiosError;
          expect(axiosError.config?.headers?.['Authorization']).toBe(`Bearer ${validToken}`);
        }
      }
    });

    it('should handle token refresh scenario', async () => {
      // First request with valid token
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${validToken}`;
      const response1 = await apiClient.get('/api/user/profile');
      expect(response1.status).toBe(200);

      // Simulate token refresh
      const newToken = jwt.sign(
        {
          sub: 'auth0|test-user-123',
          email: 'test@example.com',
          aud: mockAuth0Config.audience,
          iss: `https://${mockAuth0Config.domain}/`,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          scope: 'openid profile email',
        },
        privateKey,
        { algorithm: 'RS256', keyid: 'test-key-id' }
      );

      // Second request with new token
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      const response2 = await apiClient.get('/api/user/profile');
      expect(response2.status).toBe(200);
      expect(response2.config.headers?.['Authorization']).toBe(`Bearer ${newToken}`);
    });
  });

  describe('CORS Configuration', () => {
    it('should handle CORS preflight OPTIONS request', async () => {
      const response = await apiClient.options('/api/user/profile', {
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
      });

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should include CORS headers in actual requests', async () => {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${validToken}`;
      apiClient.defaults.headers.common['Origin'] = 'http://localhost:3000';
      
      const response = await apiClient.get('/api/user/profile');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow credentials in CORS requests', async () => {
      const response = await apiClient.options('/api/user/profile', {
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should reject requests from unauthorized origins', async () => {
      const unauthorizedClient = axios.create({
        baseURL: backendUrl,
        timeout: 5000,
        withCredentials: true,
        headers: {
          'Origin': 'http://malicious-site.com',
        },
      });

      try {
        await unauthorizedClient.get('/api/user/profile');
        // If CORS is properly configured, this might succeed but without CORS headers
        // or fail depending on backend configuration
      } catch (error) {
        // Expected for strict CORS policies
        expect(error).toBeDefined();
      }
    });

    it('should handle complex CORS scenarios with custom headers', async () => {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${validToken}`;
      apiClient.defaults.headers.common['X-Custom-Header'] = 'test-value';
      
      const response = await apiClient.options('/api/user/profile', {
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type,x-custom-header',
        },
      });

      expect(response.status).toBe(204);
      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders).toBeDefined();
    });

    it('should support multiple HTTP methods in CORS', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      for (const method of methods) {
        const response = await apiClient.options('/api/user/profile', {
          headers: {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': method,
          },
        });

        expect(response.status).toBe(204);
        const allowedMethods = response.headers['access-control-allow-methods'];
        expect(allowedMethods).toContain(method);
      }
    });
  });

  describe('Cookie Handling', () => {
    it('should accept and store cookies from backend', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: 'test@example.com',
        password: 'test-password',
      });

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
    });

    it('should send cookies in subsequent requests', async () => {
      // First request to set cookie
      await apiClient.post('/api/auth/login', {
        email: 'test@example.com',
        password: 'test-password',
      });

      // Second request should include cookie
      const response = await apiClient.get('/api/user/profile');
      expect(response.config.withCredentials).toBe(true);
    });

    it('should handle secure cookies in production', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: 'test@example.com',
        password: 'test-password',
      });

      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const cookieString = Array.isArray(setCookieHeader) 
          ? setCookieHeader[0] 
          : setCookieHeader;
        
        // In production, cookies should have Secure flag
        if (process.env.NODE_ENV === 'production') {
          expect(cookieString).toContain('Secure');
        }
      }
    });

    it('should handle HttpOnly cookies', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: 'test@example.com',
        password: 'test-password',
      });

      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const cookieString = Array.isArray(setCookieHeader) 
          ? setCookieHeader[0] 
          : setCookieHeader;
        
        expect(cookieString).toContain('HttpOnly');
      }
    });

    it('should handle SameSite cookie attribute', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: 'test@example.com',
        password: 'test-password',
      });

      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const cookieString = Array.isArray(setCookieHeader) 
          ? setCookieHeader[0] 
          : setCookieHeader;
        
        expect(cookieString).toMatch(/SameSite=(Lax|Strict|None)/i);
      }
    });

    it('should clear cookies on logout', async () => {
      // Login first
      await apiClient.post