import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { ApiError } from '@/utils/ApiError';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_SERVER_ERROR';
  let details: any = undefined;

  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle different types of errors
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
    details = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  } else if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry';
    code = 'DUPLICATE_ENTRY';
    details = 'A record with this information already exists';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
    code = 'FILE_UPLOAD_ERROR';
    details = error.message;
  }

  // Don't expose stack trace in production
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  };

  res.status(statusCode).json(errorResponse);
};
