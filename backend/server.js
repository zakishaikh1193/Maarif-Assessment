import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import { 
  corsOptions, 
  securityHeaders, 
  compressionMiddleware, 
  loggingMiddleware,
  generalRateLimit,
  errorHandler,
  notFoundHandler,
  requestLogger
} from './middleware/security.js';
import { authRateLimit } from './middleware/security.js';

// Import routes
import authRoutes from './routes/auth.js';
import subjectsRoutes from './routes/subjects.js';
import adminRoutes from './routes/admin.js';
import studentRoutes from './routes/student.js';
import schoolsRoutes from './routes/schools.js';
import gradesRoutes from './routes/grades.js';
import assessmentConfigRoutes from './routes/assessmentConfig.js';
import competenciesRoutes from './routes/competencies.js';
import ssoRoutes from './routes/sso.js';
import assignmentsRoutes from './routes/assignments.js';
import uploadsRoutes from './routes/uploads.js';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Check for required Node modules
const checkDependencies = async () => {
  // Since we're using ES modules, if imports fail, the server won't start
  // This is just a placeholder check - actual module errors will be caught during import
  try {
    // Check if node_modules exists
    const fs = await import('fs');
    const path = await import('path');
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      console.error('❌ node_modules directory not found');
      console.error('💡 Run: npm install in the backend directory');
      return false;
    }
    
    console.log('✅ node_modules directory found');
    console.log('   (Module availability verified - imports succeeded)');
    return true;
  } catch (error) {
    // If we can't check, assume it's OK (modules already imported successfully)
    console.log('✅ Node modules available (imports succeeded)');
    return true;
  }
};

// Check environment variables
const checkEnvironment = () => {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('💡 Check your .env file in the backend directory');
    return false;
  }
  
  console.log('✅ All required environment variables are set');
  console.log('📋 Environment check:');
  console.log(`   - DB_HOST: ${process.env.DB_HOST}`);
  console.log(`   - DB_USER: ${process.env.DB_USER}`);
  console.log(`   - DB_NAME: ${process.env.DB_NAME}`);
  console.log(`   - DB_PORT: ${process.env.DB_PORT || 3306}`);
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - PORT: ${process.env.PORT || 5000}`);
  return true;
};

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Middleware - CORS must be before other middleware
app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(compressionMiddleware);
app.use(loggingMiddleware);
app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Detect if running under Passenger (mounted at /api) or standalone
// Passenger sets various environment variables when running
const isPassengerMounted = !!(
  process.env.PASSENGER_BASE_URI || 
  process.env.PASSENGER_APP_ENV ||
  process.env.PASSENGER_APP_ROOT ||
  process.env._?.includes('passenger') // Passenger process indicator
);

// Log detection result
console.log('🔍 Passenger Detection:');
console.log('   PASSENGER_BASE_URI:', process.env.PASSENGER_BASE_URI || '(not set)');
console.log('   PASSENGER_APP_ENV:', process.env.PASSENGER_APP_ENV || '(not set)');
console.log('   PASSENGER_APP_ROOT:', process.env.PASSENGER_APP_ROOT || '(not set)');
console.log('   Detected as Passenger:', isPassengerMounted);

// API routes - support both Passenger mounting and standalone
// When mounted at /api by Passenger, Passenger strips /api prefix before passing to Express
// So routes should be relative (no /api prefix) when mounted, with prefix when standalone
const apiPrefix = isPassengerMounted ? '' : '/api';

console.log(`📌 Route configuration: ${isPassengerMounted ? 'Passenger mounted at /api' : 'Standalone mode'}`);
console.log(`📌 API prefix: "${apiPrefix}"`);

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/subjects`, subjectsRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);
app.use(`${apiPrefix}/student`, studentRoutes);
app.use(`${apiPrefix}/schools`, schoolsRoutes);
app.use(`${apiPrefix}/grades`, gradesRoutes);
app.use(`${apiPrefix}/admin/assessment-configs`, assessmentConfigRoutes);
app.use(`${apiPrefix}/admin/competencies`, competenciesRoutes);
app.use(`${apiPrefix}/admin/assignments`, assignmentsRoutes);
app.use(`${apiPrefix}/sso`, ssoRoutes);
app.use(`${apiPrefix}/uploads`, uploadsRoutes);

// Root endpoint - handle both /api/ (when mounted) and / (standalone)
// When Passenger mounts at /api, a request to /api/ becomes / in Express
app.get('/', (req, res) => {
  console.log(`📥 Root endpoint hit - Original URL: ${req.originalUrl}, Path: ${req.path}`);
  const basePath = isPassengerMounted ? '/api' : '/api';
  res.json({
    message: 'Maarif Assessment Portal API',
    version: '1.0.0',
    mounted: isPassengerMounted ? 'Passenger at /api' : 'Standalone',
    requestPath: req.path,
    originalUrl: req.originalUrl,
    endpoints: {
      auth: `${basePath}/auth`,
      subjects: `${basePath}/subjects`,
      admin: `${basePath}/admin`,
      student: `${basePath}/student`,
      schools: `${basePath}/schools`,
      grades: `${basePath}/grades`,
      health: '/health'
    },
    documentation: 'API documentation coming soon'
  });
});

// Also handle /api explicitly (in case Passenger doesn't strip it or for direct access)
// Support both /api and /api/ 
app.get('/api', (req, res) => {
  console.log(`📥 /api endpoint hit - Original URL: ${req.originalUrl}, Path: ${req.path}`);
  res.json({
    message: 'Maarif Assessment Portal API',
    version: '1.0.0',
    mounted: 'Passenger at /api',
    requestPath: req.path,
    originalUrl: req.originalUrl,
    endpoints: {
      auth: '/api/auth',
      subjects: '/api/subjects',
      admin: '/api/admin',
      student: '/api/student',
      schools: '/api/schools',
      grades: '/api/grades',
      health: '/api/health'
    },
    documentation: 'API documentation coming soon'
  });
});

app.get('/api/', (req, res) => {
  console.log(`📥 /api/ endpoint hit - Original URL: ${req.originalUrl}, Path: ${req.path}`);
  res.json({
    message: 'Maarif Assessment Portal API',
    version: '1.0.0',
    mounted: 'Passenger at /api',
    requestPath: req.path,
    originalUrl: req.originalUrl,
    endpoints: {
      auth: '/api/auth',
      subjects: '/api/subjects',
      admin: '/api/admin',
      student: '/api/student',
      schools: '/api/schools',
      grades: '/api/grades',
      health: '/api/health'
    },
    documentation: 'API documentation coming soon'
  });
});

app.use('api/auth', authRateLimit);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    console.log('🔍 Starting server with diagnostics...\n');
    
    // Step 1: Check Node modules
    console.log('📦 Checking Node modules...');
    const depsOk = await checkDependencies();
    if (!depsOk) {
      process.exit(1);
    }
    console.log('');
    
    // Step 2: Check environment variables
    console.log('🔐 Checking environment variables...');
    if (!checkEnvironment()) {
      process.exit(1);
    }
    console.log('');
    
    // Step 3: Test database connection
    console.log('🗄️  Testing database connection...');
    console.log(`   Attempting to connect to: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   User: ${process.env.DB_USER}`);
    
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('\n❌ Failed to connect to database. Exiting...');
      console.error('💡 Check:');
      console.error('   1. Database server is running');
      console.error('   2. Database credentials in .env are correct');
      console.error('   3. Database user has proper permissions');
      console.error('   4. Database host is accessible from this server');
      process.exit(1);
    }
    console.log('');

    // Step 4: Start listening - bind to 0.0.0.0 for hosting
    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
      console.log('✅ Server started successfully!\n');
      console.log(`🚀 Server running on ${HOST}:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://${HOST}:${PORT}/api`);
      console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
      console.log(`\n📝 Server logs will show detailed error information\n`);
    });

  } catch (error) {
    console.error('\n❌ Failed to start server:\n');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('Stack Trace:');
    console.error(error.stack);
    console.error('\n💡 Common issues:');
    console.error('   1. Missing Node modules - run: npm install');
    console.error('   2. Database connection failed - check .env credentials');
    console.error('   3. Port already in use - change PORT in .env');
    console.error('   4. Missing environment variables - check .env file');
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
