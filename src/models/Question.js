const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  type: {
    type: String,
    enum: ['mcq-single', 'mcq-multiple', 'true-false', 'short-answer'],
    required: true
  },
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  options: [{
    text: {
      type: String,
      trim: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    // For mcq-single: String (option index)
    // For mcq-multiple: [String] (array of option indices)
    // For true-false: Boolean
    // For short-answer: String (exact match) or [String] (multiple acceptable answers)
  },
  points: {
    type: Number,
    default: 1,
    min: [0, 'Points cannot be negative']
  },
  explanation: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
questionSchema.index({ exam: 1, type: 1 });
questionSchema.index({ exam: 1, category: 1 });
questionSchema.index({ exam: 1, difficulty: 1 });

// Method to validate correct answer based on question type
questionSchema.methods.validateAnswer = function(studentAnswer) {
  switch (this.type) {
    case 'mcq-single':
      return this.correctAnswer === studentAnswer;
    
    case 'mcq-multiple':
      if (!Array.isArray(studentAnswer) || !Array.isArray(this.correctAnswer)) {
        return false;
      }
      // Check if arrays have same elements (order doesn't matter)
      return studentAnswer.length === this.correctAnswer.length &&
             studentAnswer.every(ans => this.correctAnswer.includes(ans));
    
    case 'true-false':
      return this.correctAnswer === studentAnswer;
    
    case 'short-answer':
      if (Array.isArray(this.correctAnswer)) {
        // Multiple acceptable answers
        return this.correctAnswer.some(correctAns => 
          this.normalizeAnswer(correctAns) === this.normalizeAnswer(studentAnswer)
        );
      }
      return this.normalizeAnswer(this.correctAnswer) === this.normalizeAnswer(studentAnswer);
    
    default:
      return false;
  }
};

// Helper method to normalize answers for comparison
questionSchema.methods.normalizeAnswer = function(answer) {
  return String(answer).toLowerCase().trim().replace(/\s+/g, ' ');
};

// Static method to get questions by exam with optional filtering
questionSchema.statics.getExamQuestions = async function(examId, options = {}) {
  const { 
    category, 
    difficulty, 
    limit = 10, 
    randomize = false,
    questionType 
  } = options;
  
  try {
    if (randomize) {
      // Use aggregation pipeline for random sampling
      const pipeline = [
        { 
          $match: { 
            exam: new mongoose.Types.ObjectId(examId), 
            isActive: true 
          } 
        }
      ];
      
      // Add additional filters to pipeline
      const matchStage = {};
      if (category) matchStage.category = category;
      if (difficulty) matchStage.difficulty = difficulty;
      if (questionType) matchStage.type = questionType;
      
      if (Object.keys(matchStage).length > 0) {
        pipeline[0].$match = { ...pipeline[0].$match, ...matchStage };
      }
      
      // Add sample stage for randomization
      pipeline.push({ $sample: { size: limit } });
      
      // Add projection to exclude correct answers for security
      pipeline.push({
        $project: {
          questionText: 1,
          type: 1,
          options: {
            text: 1,
            // Don't include isCorrect in response to prevent cheating
          },
          points: 1,
          explanation: 1,
          category: 1,
          difficulty: 1
        }
      });
      
      return await this.aggregate(pipeline);
    } else {
      // Use regular query without randomization
      let query = this.find({ 
        exam: examId, 
        isActive: true 
      });
      
      if (category) {
        query = query.where('category', category);
      }
      
      if (difficulty) {
        query = query.where('difficulty', difficulty);
      }
      
      if (questionType) {
        query = query.where('type', questionType);
      }
      
      query = query.limit(limit);
      
      // Exclude correct answers from the response
      query = query.select('-correctAnswer -options.isCorrect');
      
      return await query.exec();
    }
  } catch (error) {
    console.error('Error in getExamQuestions:', error);
    throw error;
  }
};

// Alternative method specifically for exam start (recommended)
questionSchema.statics.getQuestionsForExam = async function(examId, count = 10) {
  try {
    const questions = await this.aggregate([
      {
        $match: {
          exam: new mongoose.Types.ObjectId(examId),
          isActive: true
        }
      },
      { $sample: { size: count } },
      {
        $project: {
          questionText: 1,
          type: 1,
          options: {
            text: 1
            // intentionally excluding isCorrect
          },
          points: 1,
          explanation: 1,
          category: 1,
          difficulty: 1
        }
      }
    ]);
    
    return questions;
  } catch (error) {
    console.error('Error in getQuestionsForExam:', error);
    throw error;
  }
};

module.exports = mongoose.model('Question', questionSchema);







// const mongoose = require('mongoose');

// const questionSchema = new mongoose.Schema({
//   exam: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Exam',
//     required: true
//   },
//   type: {
//     type: String,
//     enum: ['mcq-single', 'mcq-multiple', 'true-false', 'short-answer'],
//     required: true
//   },
//   questionText: {
//     type: String,
//     required: [true, 'Question text is required'],
//     trim: true
//   },
//   options: [{
//     text: {
//       type: String,
//       trim: true
//     },
//     isCorrect: {
//       type: Boolean,
//       default: false
//     }
//   }],
//   correctAnswer: {
//     type: mongoose.Schema.Types.Mixed,
//     // For mcq-single: String (option index)
//     // For mcq-multiple: [String] (array of option indices)
//     // For true-false: Boolean
//     // For short-answer: String (exact match) or [String] (multiple acceptable answers)
//   },
//   points: {
//     type: Number,
//     default: 1,
//     min: [0, 'Points cannot be negative']
//   },
//   explanation: {
//     type: String,
//     trim: true
//   },
//   category: {
//     type: String,
//     trim: true
//   },
//   difficulty: {
//     type: String,
//     enum: ['easy', 'medium', 'hard'],
//     default: 'medium'
//   },
//   isActive: {
//     type: Boolean,
//     default: true
//   }
// }, {
//   timestamps: true
// });

// // Indexes
// questionSchema.index({ exam: 1, type: 1 });
// questionSchema.index({ exam: 1, category: 1 });
// questionSchema.index({ exam: 1, difficulty: 1 });

// // Method to validate correct answer based on question type
// questionSchema.methods.validateAnswer = function(studentAnswer) {
//   switch (this.type) {
//     case 'mcq-single':
//       return this.correctAnswer === studentAnswer;
    
//     case 'mcq-multiple':
//       if (!Array.isArray(studentAnswer) || !Array.isArray(this.correctAnswer)) {
//         return false;
//       }
//       // Check if arrays have same elements (order doesn't matter)
//       return studentAnswer.length === this.correctAnswer.length &&
//              studentAnswer.every(ans => this.correctAnswer.includes(ans));
    
//     case 'true-false':
//       return this.correctAnswer === studentAnswer;
    
//     case 'short-answer':
//       if (Array.isArray(this.correctAnswer)) {
//         // Multiple acceptable answers
//         return this.correctAnswer.some(correctAns => 
//           this.normalizeAnswer(correctAns) === this.normalizeAnswer(studentAnswer)
//         );
//       }
//       return this.normalizeAnswer(this.correctAnswer) === this.normalizeAnswer(studentAnswer);
    
//     default:
//       return false;
//   }
// };

// // Helper method to normalize answers for comparison
// questionSchema.methods.normalizeAnswer = function(answer) {
//   return String(answer).toLowerCase().trim().replace(/\s+/g, ' ');
// };

// // Static method to get questions by exam with optional filtering
// questionSchema.statics.getExamQuestions = function(examId, options = {}) {
//   const { category, difficulty, limit, randomize } = options;
  
//   let query = this.find({ exam: examId, isActive: true });
  
//   if (category) {
//     query = query.where('category', category);
//   }
  
//   if (difficulty) {
//     query = query.where('difficulty', difficulty);
//   }
  
//   if (limit) {
//     query = query.limit(limit);
//   }
  
//   if (randomize) {
//     query = query.aggregate([{ $sample: { size: limit || 100 } }]);
//   }
  
//   return query.exec();
// };

// module.exports = mongoose.model('Question', questionSchema);