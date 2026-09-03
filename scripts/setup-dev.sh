#!/usr/bin/env node

/**
 * Development Environment Setup Script
 * 
 * Automates the setup of the VelvetKey development environment including:
 * - Dependency installation for backend and frontend
 * - Environment file validation and creation
 * - Docker environment verification
 * - Database initialization
 * - Service health checks
 * 
 * Usage: ./scripts/setup-dev.sh [--skip-docker] [--skip-install] [--force]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  skipDocker: args.includes('--skip-docker'),
  skipInstall: args.includes('--skip-install'),
  force: args.includes('--force'),
};

// Project paths
const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const ENV_EXAMPLE = path.join(ROOT_DIR, '.env.example');
const ENV_DOCKER = path.join(ROOT_DIR, '.env.docker');

/**
 * Logging utilities
 */
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

/**
 * Execute shell command with error handling
 */
function exec(command, options = {}) {
  try {
    return execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || ROOT_DIR,
      encoding: 'utf-8',
    });
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
    return null;
  }
}

/**
 * Check if a command exists in PATH
 */
function commandExists(command) {
  try {
    exec(`which ${command}`, { silent: true, ignoreError: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify system prerequisites
 */
function checkPrerequisites() {
  log.section('Checking Prerequisites');

  const requirements = [
    { name: 'Node.js', command: 'node', version: '--version', minVersion: '18.0.0' },
    { name: 'npm', command: 'npm', version: '--version', minVersion: '9.0.0' },
  ];

  if (!options.skipDocker) {
    requirements.push(
      { name: 'Docker', command: 'docker', version: '--version', minVersion: '20.0.0' },
      { name: 'Docker Compose', command: 'docker-compose', version: '--version', minVersion: '2.0.0' }
    );
  }

  let allPresent = true;

  for (const req of requirements) {
    if (commandExists(req.command)) {
      const version = exec(`${req.command} ${req.version}`, { silent: true }).trim();
      log.success(`${req.name}: ${version}`);
    } else {
      log.error(`${req.name} is not installed`);
      allPresent = false;
    }
  }

  if (!allPresent) {
    log.error('Missing required dependencies. Please install them and try again.');
    process.exit(1);
  }

  log.success('All prerequisites met');
}

/**
 * Setup environment files
 */
function setupEnvironment() {
  log.section('Setting Up Environment');

  // Check if .env exists
  if (fs.existsSync(ENV_FILE) && !options.force) {
    log.warning('.env file already exists. Use --force to overwrite.');
    return;
  }

  // Copy from .env.docker if it exists, otherwise from .env.example
  let sourceFile = ENV_DOCKER;
  if (!fs.existsSync(ENV_DOCKER)) {
    if (fs.existsSync(ENV_EXAMPLE)) {
      sourceFile = ENV_EXAMPLE;
    } else {
      log.error('No environment template found (.env.example or .env.docker)');
      process.exit(1);
    }
  }

  fs.copyFileSync(sourceFile, ENV_FILE);
  log.success(`Created .env from ${path.basename(sourceFile)}`);

  // Validate required environment variables
  const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  const requiredVars = [
    'AUTH0_DOMAIN',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
    'AUTH0_AUDIENCE',
    'STRIPE_SECRET_KEY',
    'DATABASE_URL',
  ];

  const missingVars = [];
  for (const varName of requiredVars) {
    const regex = new RegExp(`^${varName}=.+$`, 'm');
    if (!regex.test(envContent) || envContent.match(regex)[0].endsWith('=')) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    log.warning('The following environment variables need to be configured:');
    missingVars.forEach((v) => console.log(`  - ${v}`));
    log.info('Please update .env with your actual credentials before running the application.');
  } else {
    log.success('All required environment variables are set');
  }
}

/**
 * Install dependencies
 */
function installDependencies() {
  if (options.skipInstall) {
    log.section('Skipping Dependency Installation');
    return;
  }

  log.section('Installing Dependencies');

  // Backend dependencies
  log.info('Installing backend dependencies...');
  if (fs.existsSync(BACKEND_DIR)) {
    exec('npm install', { cwd: BACKEND_DIR });
    log.success('Backend dependencies installed');
  } else {
    log.warning('Backend directory not found, skipping');
  }

  // Frontend dependencies
  log.info('Installing frontend dependencies...');
  if (fs.existsSync(FRONTEND_DIR)) {
    exec('npm install', { cwd: FRONTEND_DIR });
    log.success('Frontend dependencies installed');
  } else {
    log.warning('Frontend directory not found, skipping');
  }
}

/**
 * Initialize database
 */
function initializeDatabase() {
  log.section('Initializing Database');

  if (!fs.existsSync(BACKEND_DIR)) {
    log.warning('Backend directory not found, skipping database initialization');
    return;
  }

  // Check if TypeORM CLI is available
  const packageJson = JSON.parse(fs.readFileSync(path.join(BACKEND_DIR, 'package.json'), 'utf-8'));
  const hasTypeORM = packageJson.dependencies?.typeorm || packageJson.devDependencies?.typeorm;

  if (!hasTypeORM) {
    log.warning('TypeORM not found in backend dependencies, skipping migrations');
    return;
  }

  try {
    // Run migrations if they exist
    log.info('Running database migrations...');
    exec('npm run typeorm migration:run', { cwd: BACKEND_DIR, ignoreError: true });
    log.success('Database initialized');
  } catch (error) {
    log.warning('No migrations to run or migration command not configured');
  }
}

/**
 * Verify Docker setup
 */
function verifyDocker() {
  if (options.skipDocker) {
    log.section('Skipping Docker Verification');
    return;
  }

  log.section('Verifying Docker Setup');

  // Check if Docker daemon is running
  try {
    exec('docker info', { silent: true });
    log.success('Docker daemon is running');
  } catch {
    log.error('Docker daemon is not running. Please start Docker and try again.');
    process.exit(1);
  }

  // Check docker-compose.yml exists
  const composeFile = path.join(ROOT_DIR, 'docker-compose.yml');
  if (!fs.existsSync(composeFile)) {
    log.error('docker-compose.yml not found');
    process.exit(1);
  }
  log.success('docker-compose.yml found');

  // Validate docker-compose configuration
  try {
    exec('docker-compose config', { silent: true });
    log.success('Docker Compose configuration is valid');
  } catch {
    log.error('Invalid Docker Compose configuration');
    process.exit(1);
  }
}

/**
 * Create necessary directories
 */
function createDirectories() {
  log.section('Creating Directories');

  const directories = [
    path.join(ROOT_DIR, 'logs'),
    path.join(BACKEND_DIR, 'dist'),
    path.join(FRONTEND_DIR, '.next'),
  ];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.success(`Created ${path.relative(ROOT_DIR, dir)}`);
    }
  }
}

/**
 * Display next steps
 */
function displayNextSteps() {
  log.section('Setup Complete! 🎉');

  console.log('Next steps:\n');
  console.log('1. Review and update .env with your credentials:');
  console.log('   - Auth0 configuration');
  console.log('   - Stripe API keys');
  console.log('   - Database connection string\n');

  if (!options.skipDocker) {
    console.log('2. Start the development environment:');
    console.log('   docker-compose up --build\n');
    console.log('3. Access the application:');
    console.log('   - Frontend: http://localhost:3000');
    console.log('   - Backend:  http://localhost:3010');
    console.log('   - Health:   http://localhost:3010/healthz\n');
  } else {
    console.log('2. Start the backend:');
    console.log('   cd backend && npm run start:dev\n');
    console.log('3. Start the frontend (in another terminal):');
    console.log('   cd frontend && npm run dev\n');
  }

  console.log('4. Run tests:');
  console.log('   cd backend && npm test\n');

  console.log('For more information, see:');
  console.log('   - README.md');
  console.log('   - docs/DEPLOYMENT.md (if available)');
  console.log('   - docs/INFRASTRUCTURE.md (if available)\n');
}

/**
 * Main setup function
 */
async function main() {
  try {
    console.log(`${colors.bright}${colors.cyan}`);
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║   VelvetKey Development Setup Script     ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(colors.reset);

    checkPrerequisites();
    setupEnvironment();
    createDirectories();
    installDependencies();
    verifyDocker();
    initializeDatabase();
    displayNextSteps();

    process.exit(0);
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = { exec, commandExists, log };