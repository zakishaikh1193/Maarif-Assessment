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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/admin/assessment-configs', assessmentConfigRoutes);
app.use('/api/admin/competencies', competenciesRoutes);
app.use('/api/admin/assignments', assignmentsRoutes);
app.use('/api/sso', ssoRoutes);
app.use('/api/uploads', uploadsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Maarif Assessment Portal API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      subjects: '/api/subjects',
      admin: '/api/admin',
      student: '/api/student',
      schools: '/api/schools',
      grades: '/api/grades',
      health: '/health'
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
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
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