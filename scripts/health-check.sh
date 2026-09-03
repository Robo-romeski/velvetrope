#!/usr/bin/env node

/**
 * Health Check Script for VelvetKey Services
 * 
 * Verifies that all services (backend, frontend, database) are running correctly
 * and responding to requests. Exits with code 0 on success, 1 on failure.
 * 
 * Usage:
 *   ./scripts/health-check.sh
 *   node scripts/health-check.sh
 * 
 * Environment Variables:
 *   BACKEND_URL - Backend service URL (default: http://localhost:3010)
 *   FRONTEND_URL - Frontend service URL (default: http://localhost:3000)
 *   HEALTH_CHECK_TIMEOUT - Request timeout in ms (default: 5000)
 *   HEALTH_CHECK_RETRIES - Number of retry attempts (default: 3)
 *   HEALTH_CHECK_RETRY_DELAY - Delay between retries in ms (default: 2000)
 */

const http = require('http');
const https = require('https');

// Configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3010',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
  retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.HEALTH_CHECK_RETRY_DELAY || '2000', 10),
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make HTTP/HTTPS request with timeout
 * @param {string} url - URL to request
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<{statusCode: number, body: string}>}
 */
function makeRequest(url, timeout) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: timeout,
      headers: {
        'User-Agent': 'VelvetKey-HealthCheck/1.0',
      },
    };

    const req = client.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });

    req.end();
  });
}

/**
 * Check health of a service endpoint with retries
 * @param {string} name - Service name for logging
 * @param {string} url - Health check endpoint URL
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<boolean>}
 */
async function checkServiceHealth(name, url, retries = config.retries) {
  console.log(`${colors.cyan}Checking ${name}...${colors.reset}`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await makeRequest(url, config.timeout);
      
      if (response.statusCode === 200) {
        console.log(`${colors.green}✓ ${name} is healthy (${response.statusCode})${colors.reset}`);
        
        // Try to parse and display additional health info
        try {
          const healthData = JSON.parse(response.body);
          if (healthData.status) {
            console.log(`  Status: ${healthData.status}`);
          }
          if (healthData.database) {
            console.log(`  Database: ${healthData.database}`);
          }
          if (healthData.uptime) {
            console.log(`  Uptime: ${Math.floor(healthData.uptime)}s`);
          }
        } catch (parseError) {
          // Body is not JSON or doesn't contain expected fields, skip
        }
        
        return true;
      } else {
        console.log(`${colors.yellow}⚠ ${name} returned status ${response.statusCode}${colors.reset}`);
        
        if (attempt < retries) {
          console.log(`  Retrying in ${config.retryDelay}ms... (attempt ${attempt}/${retries})`);
          await sleep(config.retryDelay);
        }
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠ ${name} check failed: ${error.message}${colors.reset}`);
      
      if (attempt < retries) {
        console.log(`  Retrying in ${config.retryDelay}ms... (attempt ${attempt}/${retries})`);
        await sleep(config.retryDelay);
      }
    }
  }
  
  console.log(`${colors.red}✗ ${name} is unhealthy after ${retries} attempts${colors.reset}`);
  return false;
}

/**
 * Main health check execution
 */
async function main() {
  console.log(`${colors.blue}=== VelvetKey Health Check ===${colors.reset}\n`);
  console.log(`Backend URL:  ${config.backendUrl}`);
  console.log(`Frontend URL: ${config.frontendUrl}`);
  console.log(`Timeout:      ${config.timeout}ms`);
  console.log(`Retries:      ${config.retries}`);
  console.log('');

  const checks = [
    {
      name: 'Backend API',
      url: `${config.backendUrl}/healthz`,
    },
    {
      name: 'Frontend',
      url: config.frontendUrl,
    },
  ];

  const results = [];
  
  for (const check of checks) {
    const isHealthy = await checkServiceHealth(check.name, check.url);
    results.push({ name: check.name, healthy: isHealthy });
    console.log(''); // Add spacing between checks
  }

  // Summary
  console.log(`${colors.blue}=== Health Check Summary ===${colors.reset}`);
  
  const allHealthy = results.every(r => r.healthy);
  const healthyCount = results.filter(r => r.healthy).length;
  
  results.forEach(result => {
    const icon = result.healthy ? '✓' : '✗';
    const color = result.healthy ? colors.green : colors.red;
    console.log(`${color}${icon} ${result.name}${colors.reset}`);
  });
  
  console.log('');
  console.log(`Services healthy: ${healthyCount}/${results.length}`);
  
  if (allHealthy) {
    console.log(`${colors.green}All services are healthy!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}Some services are unhealthy. Please check the logs above.${colors.reset}`);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`${colors.red}Uncaught exception: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`${colors.red}Unhandled rejection at:${colors.reset}`, promise);
  console.error(`${colors.red}Reason:${colors.reset}`, reason);
  process.exit(1);
});

// Run main function
main().catch((error) => {
  console.error(`${colors.red}Health check failed: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1);
});