import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '@/types/user';

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePasswordResetToken(): string;
  generateEmailVerificationToken(): string;
  generateTwoFactorSecret(): { secret: string; qrCode: string };
  verifyTwoFactorToken(token: string): boolean;
  toJSON(): any;
}

const userSchema = new Schema<IUserDocument>(
  {
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // Don't include password in queries by default
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    studentId: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values
      trim: true,
      maxlength: 20,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'],
    },
    department: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    class: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    // Two-Factor Authentication
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    twoFactorBackupCodes: [{
      type: String,
      select: false,
    }],
    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: {
      type: String,
      default: null,
    },
    suspensionExpiresAt: {
      type: Date,
      default: null,
    },
    // Email Verification
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    // Password Reset
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    // Password History (for preventing reuse)
    passwordHistory: [{
      password: {
        type: String,
        select: false,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Login Tracking
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    // Preferences
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      language: {
        type: String,
        default: 'en',
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        examReminders: {
          type: Boolean,
          default: true,
        },
        resultNotifications: {
          type: Boolean,
          default: true,
        },
      },
    },
    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.passwordHistory;
        delete ret.twoFactorSecret;
        delete ret.twoFactorBackupCodes;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ studentId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    // Hash the password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    this.password = await bcrypt.hash(this.password, saltRounds);

    // Add to password history (keep last 5 passwords)
    if (this.passwordHistory) {
      this.passwordHistory.push({
        password: this.password,
        createdAt: new Date(),
      });
      
      // Keep only last 5 passwords
      if (this.passwordHistory.length > 5) {
        this.passwordHistory = this.passwordHistory.slice(-5);
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function (): string {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  return token;
};

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function (): string {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return token;
};

// Instance method to generate 2FA secret
userSchema.methods.generateTwoFactorSecret = function (): { secret: string; qrCode: string } {
  const speakeasy = require('speakeasy');
  const qrcode = require('qrcode');
  
  const secret = speakeasy.generateSecret({
    name: `${process.env.TOTP_ISSUER || 'CBT System'} (${this.email})`,
    issuer: process.env.TOTP_ISSUER || 'CBT System',
    length: 32,
  });
  
  this.twoFactorSecret = secret.base32;
  
  // Generate backup codes
  const backupCodes = [];
  for (let i = 0; i < 10; i++) {
    backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  this.twoFactorBackupCodes = backupCodes;
  
  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url,
  };
};

// Instance method to verify 2FA token
userSchema.methods.verifyTwoFactorToken = function (token: string): boolean {
  const speakeasy = require('speakeasy');
  
  if (!this.twoFactorSecret) return false;
  
  const verified = speakeasy.totp.verify({
    secret: this.twoFactorSecret,
    encoding: 'base32',
    token: token,
    window: parseInt(process.env.TOTP_WINDOW || '1'),
  });
  
  return verified;
};

// Static method to find user by email
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }
  
  const updates: any = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Static method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

export const User = mongoose.model<IUserDocument>('User', userSchema);
