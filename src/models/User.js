const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  profile: {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    avatar: {
      type: String,
      default: ''
    },
    phone: { 
      type: String,
      trim: true,
      default: ''
    },
    institution: String
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'profile.name': 'text' });

// REMOVED the phone index entirely

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Virtual for login attempts
userSchema.virtual('isLockedOut').get(function() {
  return this.isLocked();
});

module.exports = mongoose.model('User', userSchema);







// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const userSchema = new mongoose.Schema({
//   email: {
//     type: String,
//     required: [true, 'Email is required'],
//     unique: true,
//     lowercase: true,
//     trim: true,
//     match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
//   },
//   password: {
//     type: String,
//     required: [true, 'Password is required'],
//     minlength: [6, 'Password must be at least 6 characters'],
//     select: false
//   },
//   role: {
//     type: String,
//     enum: ['student', 'admin'],
//     default: 'student'
//   },
//   profile: {
//     name: {
//       type: String,
//       required: [true, 'Name is required'],
//       trim: true
//     },
//     avatar: {
//       type: String,
//       default: ''
//     },
//     phone: { 
//       type: String,
//       trim: true,
//       default: undefined,
//       index: false
//     },
//     institution: String
//   },
//   isSuspended: {
//     type: Boolean,
//     default: false
//   },
//   twoFactorEnabled: {
//     type: Boolean,
//     default: false
//   },
//   twoFactorSecret: String,
//   lastLogin: Date,
//   loginAttempts: {
//     type: Number,
//     default: 0
//   },
//   lockUntil: Date
// }, {
//   timestamps: true
// });

// // Index for better query performance
// userSchema.index({ email: 1 });
// userSchema.index({ role: 1 });
// userSchema.index({ 'profile.name': 'text' });

// // Add sparse index for phone field to avoid duplicate null errors
// userSchema.index({ 'profile.phone': 1 }, { 
//   sparse: true,
//   unique: false // Explicitly set to non-unique
// });

// // Password hashing middleware
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
  
//   try {
//     const salt = await bcrypt.genSalt(12);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// // Instance method to check password
// userSchema.methods.comparePassword = async function(candidatePassword) {
//   if (!this.password) return false;
//   return await bcrypt.compare(candidatePassword, this.password);
// };

// // Instance method to check if account is locked
// userSchema.methods.isLocked = function() {
//   return !!(this.lockUntil && this.lockUntil > Date.now());
// };

// // Virtual for login attempts
// userSchema.virtual('isLockedOut').get(function() {
//   return this.isLocked();
// });

// module.exports = mongoose.model('User', userSchema);