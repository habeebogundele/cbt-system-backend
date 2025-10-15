import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { errorHandler } from '@/middleware/error.middleware';
import { notFoundHandler } from '@/middleware/notFound.middleware';
import { logger } from '@/utils/logger';
import { authRoutes } from '@/routes/auth.routes';
import { userRoutes } from '@/routes/user.routes';
import { examRoutes } from '@/routes/exam.routes';
import { questionRoutes } from '@/routes/question.routes';
import { attemptRoutes } from '@/routes/attempt.routes';
import { resultRoutes } from '@/routes/result.routes';
import { analyticsRoutes } from '@/routes/analytics.routes';
import { reportRoutes } from '@/routes/report.routes';
import { notificationRoutes } from '@/routes/notification.routes';
import { uploadRoutes } from '@/routes/upload.routes';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }));
}

// Data sanitization
app.use(mongoSanitize()); // Prevent NoSQL injection attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/attempts', attemptRoutes);
app.use('/api/v1/results', resultRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/upload', uploadRoutes);

// Student-specific routes
app.use('/api/v1/student/exams', examRoutes);
app.use('/api/v1/student/attempts', attemptRoutes);
app.use('/api/v1/student/results', resultRoutes);

// Admin-specific routes
app.use('/api/v1/admin/users', userRoutes);
app.use('/api/v1/admin/exams', examRoutes);
app.use('/api/v1/admin/analytics', analyticsRoutes);
app.use('/api/v1/admin/reports', reportRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CBT System API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/api/v1/health',
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export { app };
