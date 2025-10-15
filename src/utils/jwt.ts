import jwt from 'jsonwebtoken';
import { ApiError } from './ApiError';

export interface JwtPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Generate access and refresh tokens
export const generateTokens = (userId: string, role: string): TokenPair => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
  const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT secrets are not configured');
  }

  const payload: JwtPayload = {
    userId,
    role,
  };

  const accessToken = jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiresIn,
    issuer: 'cbt-system',
    audience: 'cbt-system-users',
  });

  const refreshToken = jwt.sign(payload, jwtRefreshSecret, {
    expiresIn: jwtRefreshExpiresIn,
    issuer: 'cbt-system',
    audience: 'cbt-system-users',
  });

  return {
    accessToken,
    refreshToken,
  };
};

// Verify JWT token
export const verifyToken = (token: string, secret: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'cbt-system',
      audience: 'cbt-system-users',
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw ApiError.unauthorized('Invalid token');
    } else {
      throw ApiError.unauthorized('Token verification failed');
    }
  }
};

// Verify access token
export const verifyAccessToken = (token: string): JwtPayload => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT secret is not configured');
  }

  return verifyToken(token, jwtSecret);
};

// Verify refresh token
export const verifyRefreshToken = (token: string): JwtPayload => {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtRefreshSecret) {
    throw new Error('JWT refresh secret is not configured');
  }

  return verifyToken(token, jwtRefreshSecret);
};

// Decode token without verification (for debugging)
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    return null;
  }
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (!decoded || !decoded.exp) {
      return true;
    }

    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    return true;
  }
};

// Get token expiration time
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

// Generate temporary token for password reset, email verification, etc.
export const generateTemporaryToken = (payload: any, expiresIn: string = '1h'): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT secret is not configured');
  }

  return jwt.sign(payload, jwtSecret, {
    expiresIn,
    issuer: 'cbt-system',
    audience: 'cbt-system-temp',
  });
};

// Verify temporary token
export const verifyTemporaryToken = (token: string): any => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT secret is not configured');
  }

  try {
    return jwt.verify(token, jwtSecret, {
      issuer: 'cbt-system',
      audience: 'cbt-system-temp',
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw ApiError.unauthorized('Invalid token');
    } else {
      throw ApiError.unauthorized('Token verification failed');
    }
  }
};
