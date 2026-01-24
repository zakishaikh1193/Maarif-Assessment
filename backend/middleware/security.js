import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5, // 5 requests per window
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// General rate limiting
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// CORS configuration
export const corsOptions = {
  origin: (origin, callback) => {
    // In development, allow all localhost origins
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    
    if (isDevelopment) {
      // Allow all localhost and 127.0.0.1 origins in development
      if (!origin || 
          origin.startsWith('http://localhost:') || 
          origin.startsWith('http://127.0.0.1:') ||
          origin.includes('localhost')) {
        console.log(`CORS: Allowing origin in development: ${origin || 'no origin'}`);
        return callback(null, true);
      }
    }
    
    // In production, check against allowed origins
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : [];
    
    // Allow requests with no origin (e.g., mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      console.log(`CORS: Allowing origin: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // Disable CSP in development to avoid CORS issues
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false // Allow cross-origin requests
});

// Compression middleware
export const compressionMiddleware = compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
});

// Logging middleware
export const loggingMiddleware = morgan('combined', {
  skip: (req, res) => res.statusCode < 400,
  stream: {
    write: (message) => {
      console.log(message.trim());
    }
  }
});

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  // Log full error details for debugging
  console.error('\n❌ ========== ERROR OCCURRED ==========');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Request:', req.method, req.originalUrl);
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Error Code:', err.code);
  console.error('Error SQL State:', err.sqlState);
  console.error('Error SQL Message:', err.sqlMessage);
  
  if (err.stack) {
    console.error('Stack Trace:');
    console.error(err.stack);
  }
  
  // Log request details if available
  if (req.body && Object.keys(req.body).length > 0) {
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
  }
  if (req.query && Object.keys(req.query).length > 0) {
    console.error('Request Query:', JSON.stringify(req.query, null, 2));
  }
  if (req.params && Object.keys(req.params).length > 0) {
    console.error('Request Params:', JSON.stringify(req.params, null, 2));
  }
  
  console.error('=====================================\n');

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message,
      code: 'VALIDATION_ERROR'
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'UNAUTHORIZED'
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'Resource already exists',
      code: 'DUPLICATE_ENTRY',
      details: err.message
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      error: 'Referenced resource not found',
      code: 'FOREIGN_KEY_CONSTRAINT',
      details: err.message
    });
  }

  // Database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      error: 'Database connection failed',
      code: 'DATABASE_CONNECTION_ERROR',
      details: 'Unable to connect to database. Please check server logs.'
    });
  }

  // MySQL errors
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(500).json({
      error: 'Database error',
      code: 'DATABASE_ERROR',
      details: err.message,
      sqlCode: err.code
    });
  }

  // Default error - but include more details in development
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(isDevelopment && {
      details: err.message,
      stack: err.stack,
      name: err.name
    })
  });
};

// Not found middleware
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path
  });
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
};
