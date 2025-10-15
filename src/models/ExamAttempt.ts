import mongoose, { Document, Schema } from 'mongoose';
import { IExamAttempt } from '@/types/attempt';

export interface IExamAttemptDocument extends IExamAttempt, Document {
  calculateScore(): number;
  calculatePercentage(): number;
  isPassed(): boolean;
  getTimeRemaining(): number;
  addSecurityEvent(event: string, details?: string): void;
  toJSON(): any;
}

const examAttemptSchema = new Schema<IExamAttemptDocument>(
  {
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'auto_submitted', 'terminated', 'abandoned'],
      default: 'in_progress',
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    timeTaken: {
      type: Number,
      default: 0, // in seconds
    },
    score: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    grade: {
      type: String,
      default: null,
    },
    answers: [{
      questionId: {
        type: Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
      },
      answer: {
        type: Schema.Types.Mixed,
        default: null,
      },
      isCorrect: {
        type: Boolean,
        default: false,
      },
      marksAwarded: {
        type: Number,
        default: 0,
      },
      timeTaken: {
        type: Number,
        default: 0, // in seconds
      },
      isFlagged: {
        type: Boolean,
        default: false,
      },
      isReviewed: {
        type: Boolean,
        default: false,
      },
      answeredAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Security and monitoring
    securityLog: [{
      timestamp: {
        type: Date,
        default: Date.now,
      },
      event: {
        type: String,
        enum: ['tab_switch', 'fullscreen_exit', 'copy_attempt', 'right_click', 'window_blur', 'window_focus', 'key_press', 'mouse_activity'],
        required: true,
      },
      details: {
        type: String,
        default: null,
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low',
      },
    }],
    // Device and network information
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    deviceFingerprint: {
      type: String,
      default: null,
    },
    browserInfo: {
      name: String,
      version: String,
      platform: String,
    },
    screenResolution: {
      width: Number,
      height: Number,
    },
    // Grading information
    gradedAt: {
      type: Date,
      default: null,
    },
    gradedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    isGraded: {
      type: Boolean,
      default: false,
    },
    gradingMethod: {
      type: String,
      enum: ['automatic', 'manual', 'hybrid'],
      default: 'automatic',
    },
    // Review and moderation
    isUnderReview: {
      type: Boolean,
      default: false,
    },
    reviewReason: {
      type: String,
      default: null,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    // Performance metrics
    performanceMetrics: {
      averageTimePerQuestion: {
        type: Number,
        default: 0,
      },
      questionsAnswered: {
        type: Number,
        default: 0,
      },
      questionsFlagged: {
        type: Number,
        default: 0,
      },
      questionsReviewed: {
        type: Number,
        default: 0,
      },
      totalClicks: {
        type: Number,
        default: 0,
      },
      totalKeyStrokes: {
        type: Number,
        default: 0,
      },
      idleTime: {
        type: Number,
        default: 0, // in seconds
      },
    },
    // Session information
    sessionId: {
      type: String,
      default: null,
    },
    isFullScreen: {
      type: Boolean,
      default: false,
    },
    fullScreenExits: {
      type: Number,
      default: 0,
    },
    tabSwitches: {
      type: Number,
      default: 0,
    },
    copyAttempts: {
      type: Number,
      default: 0,
    },
    rightClicks: {
      type: Number,
      default: 0,
    },
    // Auto-save information
    lastSaved: {
      type: Date,
      default: Date.now,
    },
    autoSaveCount: {
      type: Number,
      default: 0,
    },
    // Network information
    networkInfo: {
      connectionType: String,
      effectiveType: String,
      downlink: Number,
      rtt: Number,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
examAttemptSchema.index({ examId: 1, studentId: 1 });
examAttemptSchema.index({ studentId: 1, status: 1 });
examAttemptSchema.index({ examId: 1, status: 1 });
examAttemptSchema.index({ submittedAt: -1 });
examAttemptSchema.index({ startTime: -1 });
examAttemptSchema.index({ ipAddress: 1 });

// Virtual for completion percentage
examAttemptSchema.virtual('completionPercentage').get(function () {
  if (!this.answers || this.answers.length === 0) return 0;
  const answeredQuestions = this.answers.filter((answer: any) => answer.answer !== null).length;
  return Math.round((answeredQuestions / this.answers.length) * 100);
});

// Virtual for time remaining
examAttemptSchema.virtual('timeRemaining').get(function () {
  if (this.status !== 'in_progress') return 0;
  
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
  
  // Get exam duration from populated exam or default
  const examDuration = this.exam?.duration || 60; // default 60 minutes
  const totalSeconds = examDuration * 60;
  
  return Math.max(0, totalSeconds - elapsed);
});

// Instance methods
examAttemptSchema.methods.calculateScore = function (): number {
  if (!this.answers || this.answers.length === 0) return 0;
  
  return this.answers.reduce((total: number, answer: any) => {
    return total + (answer.marksAwarded || 0);
  }, 0);
};

examAttemptSchema.methods.calculatePercentage = function (): number {
  if (this.totalMarks === 0) return 0;
  return Math.round((this.score / this.totalMarks) * 100);
};

examAttemptSchema.methods.isPassed = function (): boolean {
  // Get pass mark from populated exam or default
  const passMark = this.exam?.passMark || 50;
  return this.percentage >= passMark;
};

examAttemptSchema.methods.getTimeRemaining = function (): number {
  return this.timeRemaining;
};

examAttemptSchema.methods.addSecurityEvent = function (event: string, details?: string): void {
  this.securityLog.push({
    timestamp: new Date(),
    event,
    details: details || null,
    severity: this.getEventSeverity(event),
  });
};

// Helper method to determine event severity
examAttemptSchema.methods.getEventSeverity = function (event: string): string {
  const severityMap: Record<string, string> = {
    'tab_switch': 'medium',
    'fullscreen_exit': 'high',
    'copy_attempt': 'high',
    'right_click': 'medium',
    'window_blur': 'low',
    'window_focus': 'low',
    'key_press': 'low',
    'mouse_activity': 'low',
  };
  
  return severityMap[event] || 'low';
};

// Static methods
examAttemptSchema.statics.findByExam = function (examId: string) {
  return this.find({ examId }).sort({ submittedAt: -1 });
};

examAttemptSchema.statics.findByStudent = function (studentId: string) {
  return this.find({ studentId }).sort({ submittedAt: -1 });
};

examAttemptSchema.statics.findActive = function () {
  return this.find({ status: 'in_progress' });
};

examAttemptSchema.statics.findCompleted = function () {
  return this.find({ status: { $in: ['submitted', 'auto_submitted'] } });
};

// Pre-save middleware
examAttemptSchema.pre('save', function (next) {
  // Calculate time taken
  if (this.endTime && this.startTime) {
    this.timeTaken = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
  }

  // Calculate score and percentage
  if (this.answers && this.answers.length > 0) {
    this.score = this.calculateScore();
    this.percentage = this.calculatePercentage();
  }

  // Determine if passed
  if (this.percentage > 0) {
    this.passed = this.isPassed();
  }

  // Set submitted time
  if (this.status === 'submitted' || this.status === 'auto_submitted') {
    if (!this.submittedAt) {
      this.submittedAt = new Date();
    }
    if (!this.endTime) {
      this.endTime = new Date();
    }
  }

  next();
});

export const ExamAttempt = mongoose.model<IExamAttemptDocument>('ExamAttempt', examAttemptSchema);
