#!/usr/bin/env node

/**
 * Integration Tests for Infrastructure Validation Script
 * 
 * Tests the test-infrastructure.sh script which validates:
 * - Docker services (backend, frontend, database)
 * - API endpoints and health checks
 * - Database connections and migrations
 * - Environment configuration
 * - Service dependencies and networking
 * 
 * @requires docker
 * @requires docker-compose
 * @requires node >= 20.x
 */

const { execSync, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const https = require('https');

const execAsync = promisify(require('child_process').exec);

// Test configuration
const TEST_CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3010',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || '5432',
  TIMEOUT: 60000, // 60 seconds for infrastructure operations
  RETRY_ATTEMPTS: 5,
  RETRY_DELAY: 2000,
};

// Test state
let testContext = {
  dockerComposeStarted: false,
  servicesRunning: [],
  cleanupHandlers: [],
};

/**
 * Utility: Execute command with timeout and error handling
 */
async function execWithTimeout(command, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Command timeout after ${timeout}ms: ${command}`));
    }, timeout);

    execAsync(command)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Utility: Wait for service to be ready
 */
async function waitForService(url, maxAttempts = TEST_CONFIG.RETRY_ATTEMPTS) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await httpGet(url);
      console.log(`✓ Service ready at ${url}`);
      return true;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Service not ready after ${maxAttempts} attempts: ${url}`);
      }
      console.log(`Waiting for service (attempt ${attempt}/${maxAttempts})...`);
      await sleep(TEST_CONFIG.RETRY_DELAY);
    }
  }
}

/**
 * Utility: HTTP GET request
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Utility: Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Setup: Create test infrastructure script
 */
async function setupTestScript() {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'test-infrastructure.sh');
  const scriptContent = `#!/usr/bin/env node

/**
 * Infrastructure Validation Script
 * Validates entire infrastructure setup including Docker services, API endpoints, and database connections
 */

const { execSync } = require('child_process');
const http = require('http');
const https = require('https');

const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3010',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || '5432',
  TIMEOUT: 30000,
};

let exitCode = 0;

function log(message, type = 'info') {
  const prefix = { info: '→', success: '✓', error: '✗', warn: '⚠' }[type] || '→';
  console.log(\`\${prefix} \${message}\`);
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => reject(new Error('Request timeout')), CONFIG.TIMEOUT);
    
    client.get(url, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function checkDockerServices() {
  log('Checking Docker services...', 'info');
  
  try {
    const output = execSync('docker-compose ps --format json', { encoding: 'utf8' });
    const services = output.trim().split('\\n').filter(Boolean).map(JSON.parse);
    
    const requiredServices = ['backend', 'frontend', 'postgres'];
    const runningServices = services.filter(s => s.State === 'running');
    
    for (const required of requiredServices) {
      const service = runningServices.find(s => s.Service.includes(required) || s.Name.includes(required));
      if (service) {
        log(\`Service \${required} is running\`, 'success');
      } else {
        log(\`Service \${required} is NOT running\`, 'error');
        exitCode = 1;
      }
    }
    
    return exitCode === 0;
  } catch (error) {
    log(\`Docker check failed: \${error.message}\`, 'error');
    exitCode = 1;
    return false;
  }
}

async function checkAPIEndpoints() {
  log('Checking API endpoints...', 'info');
  
  const endpoints = [
    { name: 'Backend Health', url: \`\${CONFIG.BACKEND_URL}/health\` },
    { name: 'Backend API', url: \`\${CONFIG.BACKEND_URL}/api\` },
    { name: 'Frontend', url: CONFIG.FRONTEND_URL },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await httpGet(endpoint.url);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        log(\`\${endpoint.name} is accessible (HTTP \${response.statusCode})\`, 'success');
      } else {
        log(\`\${endpoint.name} returned HTTP \${response.statusCode}\`, 'warn');
      }
    } catch (error) {
      log(\`\${endpoint.name} is NOT accessible: \${error.message}\`, 'error');
      exitCode = 1;
    }
  }
  
  return exitCode === 0;
}

async function checkDatabaseConnection() {
  log('Checking database connection...', 'info');
  
  try {
    const response = await httpGet(\`\${CONFIG.BACKEND_URL}/health\`);
    const health = JSON.parse(response.data);
    
    if (health.database && health.database.status === 'up') {
      log('Database connection is healthy', 'success');
      return true;
    } else {
      log('Database connection is unhealthy', 'error');
      exitCode = 1;
      return false;
    }
  } catch (error) {
    log(\`Database check failed: \${error.message}\`, 'error');
    exitCode = 1;
    return false;
  }
}

async function main() {
  log('Starting infrastructure validation...', 'info');
  
  await checkDockerServices();
  await checkAPIEndpoints();
  await checkDatabaseConnection();
  
  if (exitCode === 0) {
    log('All infrastructure checks passed!', 'success');
  } else {
    log('Some infrastructure checks failed!', 'error');
  }
  
  process.exit(exitCode);
}

main().catch((error) => {
  log(\`Fatal error: \${error.message}\`, 'error');
  process.exit(1);
});
`;

  await fs.mkdir(path.dirname(scriptPath), { recursive: true });
  await fs.writeFile(scriptPath, scriptContent, { mode: 0o755 });
  
  return scriptPath;
}

/**
 * Setup: Start Docker Compose services
 */
async function startDockerServices() {
  console.log('Starting Docker Compose services...');
  
  try {
    // Stop any existing services
    try {
      execSync('docker-compose down -v', { stdio: 'ignore' });
    } catch (e) {
      // Ignore errors if services weren't running
    }
    
    // Start services
    execSync('docker-compose up -d', { stdio: 'inherit' });
    testContext.dockerComposeStarted = true;
    
    // Wait for services to be ready
    await sleep(5000); // Initial wait
    
    // Wait for backend
    await waitForService(`${TEST_CONFIG.BACKEND_URL}/health`);
    
    // Wait for frontend
    await waitForService(TEST_CONFIG.FRONTEND_URL);
    
    console.log('✓ All Docker services started successfully');
    return true;
  } catch (error) {
    console.error('✗ Failed to start Docker services:', error.message);
    throw error;
  }
}

/**
 * Cleanup: Stop Docker services
 */
async function stopDockerServices() {
  if (testContext.dockerComposeStarted) {
    console.log('Stopping Docker Compose services...');
    try {
      execSync('docker-compose down -v', { stdio: 'inherit' });
      testContext.dockerComposeStarted = false;
    } catch (error) {
      console.error('Warning: Failed to stop Docker services:', error.message);
    }
  }
}

/**
 * Test Suite: Infrastructure Script Execution
 */
describe('Infrastructure Validation Script - Execution', () => {
  let scriptPath;

  beforeAll(async () => {
    scriptPath = await setupTestScript();
    await startDockerServices();
  }, TEST_CONFIG.TIMEOUT);

  afterAll(async () => {
    await stopDockerServices();
  }, 30000);

  test('should execute successfully with all services running', async () => {
    const { stdout, stderr } = await execAsync(`node ${scriptPath}`);
    
    expect(stdout).toContain('Starting infrastructure validation');
    expect(stdout).toContain('All infrastructure checks passed');
    expect(stdout).not.toContain('failed');
  }, TEST_CONFIG.TIMEOUT);

  test('should check Docker services status', async () => {
    const { stdout } = await execAsync(`node ${scriptPath}`);
    
    expect(stdout).toContain('Checking Docker services');
    expect(stdout).toContain('backend');
    expect(stdout).toContain('frontend');
    expect(stdout).toContain('postgres');
  }, TEST_CONFIG.TIMEOUT);

  test('should validate API endpoints', async () => {
    const { stdout } = await execAsync(`node ${scriptPath}`);
    
    expect(stdout).toContain('Checking API endpoints');
    expect(stdout).toContain('Backend Health');
    expect(stdout).toContain('is accessible');
  }, TEST_CONFIG.TIMEOUT);

  test('should verify database connection', async () => {
    const { stdout } = await execAsync(`node ${scriptPath}`);
    
    expect(stdout).toContain('Checking database connection');
    expect(stdout).toContain('Database connection is healthy');
  }, TEST_CONFIG.TIMEOUT);
});

/**
 * Test Suite: Docker Services Validation
 */
describe('Infrastructure Validation Script - Docker Services', () => {
  let scriptPath;

  beforeAll(async () => {
    scriptPath = await setupTestScript();
  });

  beforeEach(async () => {
    await startDockerServices();
  }, TEST_CONFIG.TIMEOUT);

  afterEach(async () => {
    await stopDockerServices();
  }, 30000);

  test('should detect when backend service is down', async () => {
    // Stop backend service
    execSync('docker-compose stop backend', { stdio: 'ignore' });
    await sleep(2000);

    try {
      await execAsync(`node ${scriptPath}`);
      fail('Script should have failed with backend down');
    } catch (error) {
      expect(error.stdout || error.stderr).toContain('NOT');
    }
  }, TEST_CONFIG.TIMEOUT);

  test('should detect when database service is down', async () => {
    // Stop database service
    execSync('docker-compose stop postgres', { stdio: 'ignore' });
    await sleep(2000);

    try {
      await execAsync(`node ${scriptPath}`);
      fail('Script should have failed with database down');
    } catch (error) {
      expect(error.stdout || error.stderr).toContain('NOT');
    }
  }, TEST_CONFIG.TIMEOUT);

  test('should handle partial service availability', async () => {
    // Stop frontend only
    execSync('docker-compose stop frontend', { stdio: 'ignore' });
    await sleep(2000);

    try {
      await execAsync(`node ${scriptPath}`);
      fail('Script should have failed with frontend down');
    } catch (error) {
      const output = error.stdout || error.stderr;
      expect(output).toContain('frontend');
      expect(output).toContain('NOT');
    }
  }, TEST_CONFIG.TIMEOUT);
});

/**
 * Test Suite: API Endpoint Validation
 */
describe('Infrastructure Validation Script - API Endpoints', () => {
  let scriptPath;

  beforeAll(async () => {
    scriptPath = await setupTestScript();
    await startDockerServices();
  }, TEST_CONFIG.TIMEOUT);

  afterAll(async () => {
    await stopDockerServices();
  }, 30000);

  test('should validate backend health endpoint', async () => {
    const response = await httpGet(`${TEST_CONFIG.BACKEND_URL}/health`);
    
    expect(response.statusCode).toBe(200);
    
    const health = JSON.parse(response.data);
    expect(health).toHaveProperty('status');
    expect(health.status).toBe('ok');
  });

  test('should validate backend API endpoint', async () => {
    const response = await httpGet(`${TEST_CONFIG.BACKEND_URL}/api`);
    
    expect(response.statusCode).toBeGreaterThanOrEqual(200);
    expect(response.statusCode).toBeLessThan(500);
  });

  test('should validate frontend accessibility', async () => {
    const response = await httpGet(TEST_CONFIG.FRONTEND_URL);
    
    expect(response.statusCode).toBe(200);
    expect(response.data).toBeTruthy();
  });

  test('should handle unreachable endpoints gracefully', async () => {
    const invalidUrl = 'http://localhost:9999/nonexistent';
    
    try