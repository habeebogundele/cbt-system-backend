export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;
  public isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || this.getDefaultCode(statusCode);
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultCode(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'TOO_MANY_REQUESTS';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  // Static factory methods for common errors
  static badRequest(message: string, details?: any): ApiError {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message: string = 'Resource not found'): ApiError {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message: string, details?: any): ApiError {
    return new ApiError(409, message, 'CONFLICT', details);
  }

  static unprocessableEntity(message: string, details?: any): ApiError {
    return new ApiError(422, message, 'UNPROCESSABLE_ENTITY', details);
  }

  static tooManyRequests(message: string = 'Too many requests'): ApiError {
    return new ApiError(429, message, 'TOO_MANY_REQUESTS');
  }

  static internal(message: string = 'Internal server error'): ApiError {
    return new ApiError(500, message, 'INTERNAL_SERVER_ERROR');
  }

  static badGateway(message: string = 'Bad gateway'): ApiError {
    return new ApiError(502, message, 'BAD_GATEWAY');
  }

  static serviceUnavailable(message: string = 'Service unavailable'): ApiError {
    return new ApiError(503, message, 'SERVICE_UNAVAILABLE');
  }
}
