import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '@/utils/jwt';
import { User } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        email: string;
      };
    }
  }
}

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw ApiError.unauthorized('Access token is required');
    }

    // Verify the token
    const decoded = verifyAccessToken(token);

    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Check if user is suspended
    if (user.isSuspended) {
      if (user.suspensionExpiresAt && user.suspensionExpiresAt > new Date()) {
        throw ApiError.forbidden(`Account suspended until ${user.suspensionExpiresAt.toISOString()}`);
      } else {
        // Suspension expired, reactivate account
        user.isSuspended = false;
        user.suspensionReason = null;
        user.suspensionExpiresAt = null;
        await user.save();
      }
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Authorization middleware - check if user has required role
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      if (!roles.includes(req.user.role)) {
        throw ApiError.forbidden('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Admin only middleware
export const adminOnly = authorize('admin');

// Student only middleware
export const studentOnly = authorize('student');

// Optional authentication middleware (doesn't throw error if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token provided, continue without user
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next(); // No token provided, continue without user
    }

    // Verify the token
    const decoded = verifyAccessToken(token);

    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return next(); // Invalid user, continue without user
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    next();
  } catch (error) {
    // If token is invalid, continue without user (don't throw error)
    next();
  }
};

// Rate limiting middleware for authentication endpoints
export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // This would typically use express-rate-limit with Redis
  // For now, we'll implement a simple in-memory rate limiter
  
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  // In a real implementation, this would be stored in Redis
  // For now, we'll use a simple approach
  if (!global.authAttempts) {
    global.authAttempts = new Map();
  }

  const attempts = global.authAttempts.get(clientIP) || [];
  
  // Remove old attempts outside the window
  const validAttempts = attempts.filter((timestamp: number) => now - timestamp < windowMs);
  
  if (validAttempts.length >= maxAttempts) {
    throw ApiError.tooManyRequests('Too many authentication attempts. Please try again later.');
  }

  // Add current attempt
  validAttempts.push(now);
  global.authAttempts.set(clientIP, validAttempts);

  next();
};

// Middleware to check if user owns the resource or is admin
export const checkOwnership = (resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      const resourceId = req.params[resourceIdParam];
      
      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // Student can only access their own resources
      if (req.user.role === 'student' && req.user.id !== resourceId) {
        throw ApiError.forbidden('You can only access your own resources');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to log authentication events
export const logAuthEvent = (event: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const userId = req.user?.id;

    logger.info('Authentication event', {
      event,
      userId,
      clientIP,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    next();
  };
};

// Middleware to check if user's email is verified
export const requireEmailVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (!user.isEmailVerified) {
      throw ApiError.forbidden('Email verification required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check if user has 2FA enabled (for admin endpoints)
export const requireTwoFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    // Only require 2FA for admin users
    if (req.user.role !== 'admin') {
      return next();
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw ApiError.forbidden('Two-factor authentication is required for admin access');
    }

    next();
  } catch (error) {
    next(error);
  }
};
