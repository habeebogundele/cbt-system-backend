import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendEmailVerification,
  enableTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  getProfile,
} from '@/controllers/auth.controller';
import { authenticate, authRateLimit, logAuthEvent } from '@/middleware/auth.middleware';

const router = Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('studentId')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Student ID must be less than 20 characters'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('class')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Class must be less than 50 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('twoFactorToken')
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Two-factor token must be 6 digits'),
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];

const resendEmailVerificationValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
];

const verifyTwoFactorValidation = [
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Two-factor token must be 6 digits'),
];

const disableTwoFactorValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Two-factor token must be 6 digits'),
];

// Public routes
router.post('/register', authRateLimit, registerValidation, logAuthEvent('register'), register);
router.post('/login', authRateLimit, loginValidation, logAuthEvent('login'), login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', authRateLimit, forgotPasswordValidation, forgotPassword);
router.post('/reset-password', authRateLimit, resetPasswordValidation, resetPassword);
router.get('/verify-email', verifyEmail);
router.post('/resend-email-verification', authRateLimit, resendEmailVerificationValidation, resendEmailVerification);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.get('/profile', getProfile);
router.post('/enable-2fa', enableTwoFactor);
router.post('/verify-2fa', verifyTwoFactorValidation, verifyTwoFactor);
router.post('/disable-2fa', disableTwoFactorValidation, disableTwoFactor);

export { router as authRoutes };
