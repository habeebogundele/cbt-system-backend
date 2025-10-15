import mongoose, { Document, Schema } from 'mongoose';
import { IQuestion } from '@/types/question';

export interface IQuestionDocument extends IQuestion, Document {
  calculateMarks(answer: any): number;
  isCorrect(answer: any): boolean;
  toJSON(): any;
}

const questionSchema = new Schema<IQuestionDocument>(
  {
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['mcq_single', 'mcq_multiple', 'true_false', 'short_answer', 'essay'],
      required: true,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    questionImage: {
      type: String,
      default: null,
    },
    options: [{
      text: {
        type: String,
        required: true,
        trim: true,
      },
      image: {
        type: String,
        default: null,
      },
      isCorrect: {
        type: Boolean,
        default: false,
      },
      order: {
        type: Number,
        required: true,
      },
    }],
    correctAnswers: [{
      type: String,
      trim: true,
    }],
    marks: {
      type: Number,
      required: true,
      min: 0.5,
      max: 100,
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    explanationImage: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      index: true,
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    // Question statistics
    statistics: {
      totalAttempts: {
        type: Number,
        default: 0,
      },
      correctAttempts: {
        type: Number,
        default: 0,
      },
      averageTime: {
        type: Number,
        default: 0,
      },
      difficultyIndex: {
        type: Number,
        default: 0.5, // 0 = very easy, 1 = very hard
      },
      discriminationIndex: {
        type: Number,
        default: 0, // -1 to 1, measures how well question distinguishes between high and low performers
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    // Question bank management
    isInQuestionBank: {
      type: Boolean,
      default: false,
    },
    questionBankId: {
      type: Schema.Types.ObjectId,
      ref: 'QuestionBank',
      default: null,
    },
    // Version control
    version: {
      type: Number,
      default: 1,
    },
    parentQuestion: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      default: null,
    },
    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        // Don't expose correct answers in JSON unless specifically requested
        if (!ret.showCorrectAnswers) {
          delete ret.correctAnswers;
          ret.options = ret.options.map((option: any) => ({
            ...option,
            isCorrect: undefined,
          }));
        }
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
questionSchema.index({ examId: 1, order: 1 });
questionSchema.index({ category: 1, difficulty: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ isInQuestionBank: 1 });
questionSchema.index({ createdBy: 1 });
questionSchema.index({ type: 1 });

// Virtual for success rate
questionSchema.virtual('successRate').get(function () {
  if (this.statistics.totalAttempts === 0) return 0;
  return Math.round((this.statistics.correctAttempts / this.statistics.totalAttempts) * 100);
});

// Instance methods
questionSchema.methods.calculateMarks = function (answer: any): number {
  if (this.isCorrect(answer)) {
    return this.marks;
  } else if (this.negativeMarks > 0) {
    return -this.negativeMarks;
  }
  return 0;
};

questionSchema.methods.isCorrect = function (answer: any): boolean {
  switch (this.type) {
    case 'mcq_single':
      if (!answer || typeof answer !== 'string') return false;
      const correctOption = this.options.find((opt: any) => opt.isCorrect);
      return correctOption && correctOption.text === answer;

    case 'mcq_multiple':
      if (!Array.isArray(answer)) return false;
      const correctOptions = this.options.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.text);
      if (answer.length !== correctOptions.length) return false;
      return correctOptions.every((correct: string) => answer.includes(correct));

    case 'true_false':
      if (typeof answer !== 'boolean') return false;
      const correctBool = this.options.find((opt: any) => opt.isCorrect)?.text === 'True';
      return answer === correctBool;

    case 'short_answer':
      if (!answer || typeof answer !== 'string') return false;
      return this.correctAnswers.some((correct: string) => 
        answer.toLowerCase().trim() === correct.toLowerCase().trim()
      );

    case 'essay':
      // Essay questions require manual grading
      return false;

    default:
      return false;
  }
};

// Static methods
questionSchema.statics.findByExam = function (examId: string) {
  return this.find({ examId }).sort({ order: 1 });
};

questionSchema.statics.findByCategory = function (category: string) {
  return this.find({ category, isActive: true });
};

questionSchema.statics.findByDifficulty = function (difficulty: string) {
  return this.find({ difficulty, isActive: true });
};

questionSchema.statics.findInQuestionBank = function () {
  return this.find({ isInQuestionBank: true, isActive: true });
};

// Pre-save middleware
questionSchema.pre('save', function (next) {
  // Validate options based on question type
  if (this.type === 'mcq_single' || this.type === 'mcq_multiple' || this.type === 'true_false') {
    if (!this.options || this.options.length < 2) {
      return next(new Error('Multiple choice questions must have at least 2 options'));
    }

    const correctOptions = this.options.filter((opt: any) => opt.isCorrect);
    if (correctOptions.length === 0) {
      return next(new Error('At least one option must be marked as correct'));
    }

    if (this.type === 'mcq_single' && correctOptions.length > 1) {
      return next(new Error('Single choice questions can only have one correct answer'));
    }
  }

  if (this.type === 'short_answer' && (!this.correctAnswers || this.correctAnswers.length === 0)) {
    return next(new Error('Short answer questions must have at least one correct answer'));
  }

  // Set order if not provided
  if (!this.order) {
    this.constructor.countDocuments({ examId: this.examId }, (err: any, count: number) => {
      if (err) return next(err);
      this.order = count + 1;
      next();
    });
  } else {
    next();
  }
});

export const Question = mongoose.model<IQuestionDocument>('Question', questionSchema);
