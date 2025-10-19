const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  studentAnswer: {
    type: mongoose.Schema.Types.Mixed,
    // Can be String, [String], Boolean, etc.
  },
  isCorrect: {
    type: Boolean,
    default: null
  },
  manuallyGraded: {
    type: Boolean,
    default: false
  },
  scoreAwarded: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  teacherFeedback: {
    type: String,
    trim: true
  }
});

const attemptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  answers: [answerSchema],
  startedAt: {
    type: Date,
    required: true
  },
  submittedAt: {
    type: Date
  },
  timeRemaining: {
    type: Number, // in seconds
    default: 0
  },
  totalScore: {
    type: Number,
    default: 0
  },
  maxPossibleScore: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  passed: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'graded', 'abandoned'],
    default: 'in-progress'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
attemptSchema.index({ student: 1, exam: 1 });
attemptSchema.index({ exam: 1, status: 1 });
attemptSchema.index({ submittedAt: -1 });
attemptSchema.index({ student: 1, submittedAt: -1 });

// Virtual for duration
attemptSchema.virtual('duration').get(function() {
  if (!this.submittedAt) return null;
  return Math.floor((this.submittedAt - this.startedAt) / 1000); // in seconds
});

// Pre-save middleware to calculate scores
attemptSchema.pre('save', function(next) {
  if (this.answers.length > 0 && this.status !== 'in-progress') {
    this.calculateScores();
  }
  next();
});

// Method to calculate scores
attemptSchema.methods.calculateScores = function() {
  let totalScore = 0;
  let maxPossibleScore = 0;

  this.answers.forEach(answer => {
    maxPossibleScore += answer.question?.points || 0;
    totalScore += answer.scoreAwarded;
  });

  this.totalScore = totalScore;
  this.maxPossibleScore = maxPossibleScore;
  this.percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  this.passed = this.percentage >= (this.exam?.passMark || 60);
};

// Static method to get student's best attempt
attemptSchema.statics.getBestAttempt = function(studentId, examId) {
  return this.findOne({
    student: studentId,
    exam: examId,
    status: { $in: ['submitted', 'graded'] }
  })
  .sort({ percentage: -1, totalScore: -1 })
  .populate('exam')
  .exec();
};

// Static method to get exam statistics
attemptSchema.statics.getExamStatistics = function(examId) {
  return this.aggregate([
    {
      $match: {
        exam: mongoose.Types.ObjectId(examId),
        status: { $in: ['submitted', 'graded'] }
      }
    },
    {
      $group: {
        _id: '$exam',
        totalAttempts: { $sum: 1 },
        averageScore: { $avg: '$totalScore' },
        averagePercentage: { $avg: '$percentage' },
        maxScore: { $max: '$totalScore' },
        minScore: { $min: '$totalScore' },
        passCount: {
          $sum: { $cond: ['$passed', 1, 0] }
        }
      }
    },
    {
      $project: {
        totalAttempts: 1,
        averageScore: { $round: ['$averageScore', 2] },
        averagePercentage: { $round: ['$averagePercentage', 2] },
        maxScore: 1,
        minScore: 1,
        passRate: {
          $round: [
            { $multiply: [{ $divide: ['$passCount', '$totalAttempts'] }, 100] },
            2
          ]
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Attempt', attemptSchema);