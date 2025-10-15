export interface IUser {
  _id?: string;
  role: 'student' | 'admin';
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId?: string;
  profilePicture?: string;
  phone?: string;
  department?: string;
  class?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  suspensionExpiresAt?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordHistory?: Array<{
    password: string;
    createdAt: Date;
  }>;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      examReminders: boolean;
      resultNotifications: boolean;
    };
  };
  createdBy?: string;
  lastModifiedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserCreate {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId?: string;
  phone?: string;
  department?: string;
  class?: string;
  role?: 'student' | 'admin';
}

export interface IUserUpdate {
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  class?: string;
  profilePicture?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      examReminders?: boolean;
      resultNotifications?: boolean;
    };
  };
}

export interface IUserLogin {
  email: string;
  password: string;
  twoFactorToken?: string;
}

export interface IUserRegister {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId?: string;
  phone?: string;
  department?: string;
  class?: string;
}

export interface IUserProfile {
  _id: string;
  role: 'student' | 'admin';
  email: string;
  firstName: string;
  lastName: string;
  studentId?: string;
  profilePicture?: string;
  phone?: string;
  department?: string;
  class?: string;
  twoFactorEnabled: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  suspensionExpiresAt?: Date;
  lastLogin?: Date;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      examReminders: boolean;
      resultNotifications: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  adminUsers: number;
  studentUsers: number;
  usersWith2FA: number;
  recentRegistrations: number;
  recentLogins: number;
}

export interface IUserFilters {
  role?: 'student' | 'admin';
  isActive?: boolean;
  isEmailVerified?: boolean;
  isSuspended?: boolean;
  department?: string;
  class?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface IUserSort {
  field: 'firstName' | 'lastName' | 'email' | 'createdAt' | 'lastLogin';
  order: 'asc' | 'desc';
}

export interface IUserPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface IUserListResponse {
  users: IUserProfile[];
  pagination: IUserPagination;
  filters: IUserFilters;
  sort: IUserSort;
}
