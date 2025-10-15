import { Request, Response, NextFunction } from 'express';
import { User, IUserDocument } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { generateTokens, verifyToken } from '@/utils/jwt';
import { sendEmail } from '@/services/email.service';
import { logger } from '@/utils/logger';
import { validationResult } from 'express-validator';

// Register new user
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }

    const { email, password, firstName, lastName, studentId, phone, department, class: userClass } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw ApiError.conflict('User with this email already exists');
    }

    // Check if studentId is unique (if provided)
    if (studentId) {
      const existingStudentId = await User.findOne({ studentId });
      if (existingStudentId) {
        throw ApiError.conflict('Student ID already exists');
      }
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      studentId,
      phone,
      department,
      class: userClass,
      role: 'student', // Default role
    });

    // Generate email verification token
    const emailToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify your email address',
        template: 'email-verification',
        data: {
          firstName: user.firstName,
          verificationLink: `${process.env.FRONTEND_URL}/auth/verify-email?token=${emailToken}`,
        },
      });
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        user: user.toJSON(),
        accessToken,
      },
    });

  } catch (error) {
    next(error);
  }
};

// Login user
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }

    const { email, password, twoFactorToken } = req.body;

    // Find user and include password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check if account is active
    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Check if account is suspended
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

    // Check if account is locked
    if (user.isLocked) {
      throw ApiError.forbidden('Account is temporarily locked due to too many failed login attempts');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        throw ApiError.badRequest('Two-factor authentication token is required');
      }

      const isTwoFactorValid = user.verifyTwoFactorToken(twoFactorToken);
      if (!isTwoFactorValid) {
        throw ApiError.unauthorized('Invalid two-factor authentication token');
      }
    }

    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        accessToken,
      },
    });

  } catch (error) {
    next(error);
  }
};

// Logout user
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logout successful',
    });

  } catch (error) {
    next(error);
  }
};

// Refresh access token
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      throw ApiError.unauthorized('Refresh token not provided');
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET!);
    if (!decoded) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or inactive');
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id.toString(), user.role);

    // Set new refresh token as httpOnly cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      success: true,
      data: {
        accessToken,
      },
    });

  } catch (error) {
    next(error);
  }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }

    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists or not
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset your password',
        template: 'password-reset',
        data: {
          firstName: user.firstName,
          resetLink: `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`,
        },
      });
    } catch (emailError) {
      logger.error('Failed to send password reset email:', emailError);
      throw ApiError.internal('Failed to send password reset email');
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }

    const { token, password } = req.body;

    // Hash the token to compare with stored hash
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    // Check if new password is different from current password
    const isSamePassword = await user.comparePassword(password);
    if (isSamePassword) {
      throw ApiError.badRequest('New password must be different from current password');
    }

    // Check password history (prevent reuse of last 5 passwords)
    if (user.passwordHistory && user.passwordHistory.length > 0) {
      for (const oldPassword of user.passwordHistory) {
        const isOldPassword = await bcrypt.compare(password, oldPassword.password);
        if (isOldPassword) {
          throw ApiError.badRequest('Password has been used recently. Please choose a different password.');
        }
      }
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful',
    });

  } catch (error) {
    next(error);
  }
};

// Verify email
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token) {
      throw ApiError.badRequest('Verification token is required');
    }

    // Hash the token to compare with stored hash
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token as string).digest('hex');

    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw ApiError.badRequest('Invalid or expired verification token');
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
    });

  } catch (error) {
    next(error);
  }
};

// Resend email verification
export const resendEmailVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.isEmailVerified) {
      throw ApiError.badRequest('Email is already verified');
    }

    // Generate new verification token
    const emailToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    await sendEmail({
      to: user.email,
      subject: 'Verify your email address',
      template: 'email-verification',
      data: {
        firstName: user.firstName,
        verificationLink: `${process.env.FRONTEND_URL}/auth/verify-email?token=${emailToken}`,
      },
    });

    res.json({
      success: true,
      message: 'Verification email sent successfully',
    });

  } catch (error) {
    next(error);
  }
};

// Enable 2FA
export const enableTwoFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.twoFactorEnabled) {
      throw ApiError.badRequest('Two-factor authentication is already enabled');
    }

    // Generate 2FA secret
    const { secret, qrCode } = user.generateTwoFactorSecret();
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication setup initiated',
      data: {
        secret,
        qrCode,
        backupCodes: user.twoFactorBackupCodes,
      },
    });

  } catch (error) {
    next(error);
  }
};

// Verify and enable 2FA
export const verifyTwoFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }

    const { token } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (!user.twoFactorSecret) {
      throw ApiError.badRequest('Two-factor authentication not set up');
    }

    // Verify token
    const isValid = user.verifyTwoFactorToken(token);
    if (!isValid) {
      throw ApiError.badRequest('Invalid verification token');
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
      data: {
        backupCodes: user.twoFactorBackupCodes,
      },
    });

  } catch (error) {
    next(error);
  }
};

// Disable 2FA
export const disableTwoFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { password, token } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw ApiError.badRequest('Two-factor authentication is not enabled');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid password');
    }

    // Verify 2FA token
    const isTokenValid = user.verifyTwoFactorToken(token);
    if (!isTokenValid) {
      throw ApiError.unauthorized('Invalid two-factor authentication token');
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully',
    });

  } catch (error) {
    next(error);
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
      },
    });

  } catch (error) {
    next(error);
  }
};
