import mongoose, { Document, Schema } from 'mongoose';
import { IExam } from '@/types/exam';

export interface IExamDocument extends IExam, Document {
  isActive(): boolean;
  isAvailable(): boolean;
  canBeTakenBy(studentId: string): boolean;
  getRemainingAttempts(studentId: string): Promise<number>;
  toJSON(): any;
}

const examSchema = new Schema<IExamDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      max: 1440, // Maximum 24 hours
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(this: IExamDocument, value: Date) {
          return value > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    passMark: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    examType: {
      type: String,
      enum: ['practice', 'quiz', 'midterm', 'final', 'assignment'],
      default: 'quiz',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    assignedGroups: [{
      type: String,
      trim: true,
    }],
    settings: {
      randomizeQuestions: {
        type: Boolean,
        default: false,
      },
      randomizeOptions: {
        type: Boolean,
        default: false,
      },
      maxAttempts: {
        type: Number,
        default: 1,
        min: 1,
        max: 10,
      },
      allowRetake: {
        type: Boolean,
        default: false,
      },
      showResultsImmediately: {
        type: Boolean,
        default: false,
      },
      showCorrectAnswers: {
        type: Boolean,
        default: false,
      },
      showResultsAfter: {
        type: Date,
        default: null,
      },
      fullScreenMode: {
        type: Boolean,
        default: true,
      },
      preventCopyPaste: {
        type: Boolean,
        default: true,
      },
      detectTabSwitch: {
        type: Boolean,
        default: true,
      },
      allowLateSubmission: {
        type: Boolean,
        default: false,
      },
      lateSubmissionPenalty: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      autoSubmit: {
        type: Boolean,
        default: true,
      },
      warningTime: {
        type: Number,
        default: 5, // minutes before auto-submit
        min: 1,
        max: 30,
      },
      allowReview: {
        type: Boolean,
        default: true,
      },
      reviewTime: {
        type: Number,
        default: 5, // minutes for review
        min: 0,
        max: 60,
      },
      negativeMarking: {
        type: Boolean,
        default: false,
      },
      negativeMarkingPercentage: {
        type: Number,
        default: 25, // 25% of question marks
        min: 0,
        max: 100,
      },
      timePerQuestion: {
        type: Number,
        default: null, // null means no limit
        min: 30, // minimum 30 seconds
      },
      allowCalculator: {
        type: Boolean,
        default: false,
      },
      allowNotes: {
        type: Boolean,
        default: false,
      },
      proctoringEnabled: {
        type: Boolean,
        default: false,
      },
      webcamRequired: {
        type: Boolean,
        default: false,
      },
      microphoneRequired: {
        type: Boolean,
        default: false,
      },
      screenRecording: {
        type: Boolean,
        default: false,
      },
    },
    // Question management
    questions: [{
      type: Schema.Types.ObjectId,
      ref: 'Question',
    }],
    questionOrder: [{
      questionId: {
        type: Schema.Types.ObjectId,
        ref: 'Question',
      },
      order: {
        type: Number,
        required: true,
      },
    }],
    // Statistics
    statistics: {
      totalAttempts: {
        type: Number,
        default: 0,
      },
      completedAttempts: {
        type: Number,
        default: 0,
      },
      averageScore: {
        type: Number,
        default: 0,
      },
      passRate: {
        type: Number,
        default: 0,
      },
      averageTime: {
        type: Number,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    // Metadata
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    category: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
    parentExam: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      default: null,
    },
    // Scheduling
    timezone: {
      type: String,
      default: 'UTC',
    },
    // Notifications
    notificationSettings: {
      sendReminder: {
        type: Boolean,
        default: true,
      },
      reminderTime: {
        type: Number,
        default: 24, // hours before exam
      },
      sendResults: {
        type: Boolean,
        default: true,
      },
      sendToInstructor: {
        type: Boolean,
        default: true,
      },
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
examSchema.index({ title: 'text', description: 'text' });
examSchema.index({ createdBy: 1, status: 1 });
examSchema.index({ startDate: 1, endDate: 1 });
examSchema.index({ status: 1, startDate: 1 });
examSchema.index({ assignedTo: 1 });
examSchema.index({ category: 1, difficulty: 1 });
examSchema.index({ isPublic: 1, status: 1 });
examSchema.index({ tags: 1 });

// Virtual for exam duration in hours
examSchema.virtual('durationHours').get(function () {
  return Math.round((this.duration / 60) * 100) / 100;
});

// Virtual for time remaining
examSchema.virtual('timeRemaining').get(function () {
  const now = new Date();
  if (now < this.startDate) {
    return this.startDate.getTime() - now.getTime();
  }
  if (now > this.endDate) {
    return 0;
  }
  return this.endDate.getTime() - now.getTime();
});

// Virtual for completion rate
examSchema.virtual('completionRate').get(function () {
  if (this.statistics.totalAttempts === 0) return 0;
  return Math.round((this.statistics.completedAttempts / this.statistics.totalAttempts) * 100);
});

// Instance methods
examSchema.methods.isActive = function (): boolean {
  const now = new Date();
  return this.status === 'published' && now >= this.startDate && now <= this.endDate;
};

examSchema.methods.isAvailable = function (): boolean {
  const now = new Date();
  return this.status === 'published' && now >= this.startDate;
};

examSchema.methods.canBeTakenBy = function (studentId: string): boolean {
  // Check if exam is assigned to the student
  const isAssigned = this.assignedTo.some((id: any) => id.toString() === studentId);
  if (!isAssigned) return false;

  // Check if exam is active
  if (!this.isActive()) return false;

  return true;
};

examSchema.methods.getRemainingAttempts = async function (studentId: string): Promise<number> {
  const ExamAttempt = mongoose.model('ExamAttempt');
  const attempts = await ExamAttempt.countDocuments({
    examId: this._id,
    studentId: studentId,
    status: { $in: ['submitted', 'auto_submitted'] },
  });

  return Math.max(0, this.settings.maxAttempts - attempts);
};

// Pre-save middleware
examSchema.pre('save', function (next) {
  // Ensure end date is after start date
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }

  // Calculate total marks from questions if not provided
  if (this.isModified('questions') && this.questions.length > 0) {
    // This will be calculated when questions are populated
  }

  next();
});

// Static methods
examSchema.statics.findActive = function () {
  const now = new Date();
  return this.find({
    status: 'published',
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
};

examSchema.statics.findByCreator = function (creatorId: string) {
  return this.find({ createdBy: creatorId }).sort({ createdAt: -1 });
};

examSchema.statics.findAssignedTo = function (studentId: string) {
  return this.find({
    assignedTo: studentId,
    status: 'published',
  }).sort({ startDate: 1 });
};

export const Exam = mongoose.model<IExamDocument>('Exam', examSchema);
