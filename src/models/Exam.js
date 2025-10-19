const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Exam title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [2000, 'Instructions cannot exceed 2000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Exam duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  availableFrom: {
    type: Date,
    required: true
  },
  availableTo: {
    type: Date,
    required: true
  },
  passMark: {
    type: Number,
    default: 60,
    min: [0, 'Pass mark cannot be negative'],
    max: [100, 'Pass mark cannot exceed 100']
  },
  maxAttempts: {
    type: Number,
    default: 1,
    min: [1, 'Max attempts must be at least 1']
  },
  isRandomized: {
    type: Boolean,
    default: false
  },
  shuffleQuestions: {
    type: Boolean,
    default: false
  },
  shuffleOptions: {
    type: Boolean,
    default: false
  },
  showResults: {
    type: Boolean,
    default: false
  },
  allowRetakes: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  categories: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for better performance
examSchema.index({ createdBy: 1, status: 1 });
examSchema.index({ availableFrom: 1, availableTo: 1 });
examSchema.index({ status: 1 });

// Virtual for checking if exam is currently available
examSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  return now >= this.availableFrom && now <= this.availableTo;
});

// Virtual for checking if exam has ended
examSchema.virtual('hasEnded').get(function() {
  return new Date() > this.availableTo;
});

// Instance method to check if user can take exam
examSchema.methods.canUserTakeExam = async function(userId) {
  const Attempt = mongoose.model('Attempt');
  
  // Check if exam is available
  if (!this.isAvailable) {
    return { canTake: false, reason: 'Exam is not available at this time' };
  }

  // Check if user has exceeded max attempts
  const attemptCount = await Attempt.countDocuments({
    exam: this._id,
    student: userId,
    status: { $in: ['submitted', 'graded'] }
  });

  if (attemptCount >= this.maxAttempts && !this.allowRetakes) {
    return { canTake: false, reason: 'Maximum attempts reached' };
  }

  return { canTake: true };
};

module.exports = mongoose.model('Exam', examSchema);