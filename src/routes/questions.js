const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const Question = require('../models/Question');
const Exam = require('../models/Exam');

const router = express.Router();

// All routes require authentication and admin role
router.use(auth, requireRole(['admin']));

// Get questions for an exam (Admin view - with correct answers)
router.get('/exam/:examId', [
  param('examId').isMongoId()
], async (req, res) => {
  try {
    const { page = 1, limit = 50, category, difficulty } = req.query;
    
    const filter = { exam: req.params.examId };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    const questions = await Question.find(filter)
      .populate('exam', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Question.countDocuments(filter);

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions'
    });
  }
});

// NEW ROUTE: Get randomized questions for exam (for students taking exam)
router.get('/exam/:examId/start', [
  param('examId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam ID',
        errors: errors.array()
      });
    }

    const { examId } = req.params;
    const { 
      limit = 20, 
      category, 
      difficulty, 
      randomize = true,
      questionType 
    } = req.query;

    // Verify exam exists and is active
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    if (!exam.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Exam is not active'
      });
    }

    // Use the static method to get randomized questions
    const questions = await Question.getExamQuestions(examId, {
      limit: parseInt(limit),
      category,
      difficulty,
      randomize: randomize === 'true',
      questionType
    });

    res.json({
      success: true,
      data: {
        exam: {
          _id: exam._id,
          title: exam.title,
          duration: exam.duration,
          instructions: exam.instructions
        },
        questions,
        count: questions.length
      }
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start exam',
      error: error.message
    });
  }
});

// Create new question
router.post('/', [
  body('exam').isMongoId(),
  body('type').isIn(['mcq-single', 'mcq-multiple', 'true-false', 'short-answer']),
  body('questionText').notEmpty().trim(),
  body('points').optional().isFloat({ min: 0 }),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Verify exam exists and user owns it
    const exam = await Exam.findOne({
      _id: req.body.exam,
      createdBy: req.user._id
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or access denied'
      });
    }

    const question = new Question(req.body);
    await question.save();

    await question.populate('exam', 'title');

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: { question }
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create question'
    });
  }
});

// Bulk create questions
router.post('/bulk', [
  body('exam').isMongoId(),
  body('questions').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { exam: examId, questions } = req.body;

    // Verify exam exists and user owns it
    const exam = await Exam.findOne({
      _id: examId,
      createdBy: req.user._id
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or access denied'
      });
    }

    // Add exam ID to each question
    const questionsWithExam = questions.map(q => ({
      ...q,
      exam: examId
    }));

    const createdQuestions = await Question.insertMany(questionsWithExam);

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions created successfully`,
      data: { questions: createdQuestions }
    });
  } catch (error) {
    console.error('Bulk create questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create questions'
    });
  }
});


// Update question
router.put('/:questionId', [
  param('questionId').isMongoId(),
  body('questionText').optional().notEmpty(),
  body('points').optional().isFloat({ min: 0 }),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { questionId } = req.params;
    
    // Find the question and verify ownership through exam
    const question = await Question.findById(questionId).populate('exam');
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Verify the exam belongs to the admin
    if (question.exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update question
    const updatedQuestion = await Question.findByIdAndUpdate(
      questionId,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('exam', 'title');

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: { question: updatedQuestion }
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update question'
    });
  }
});

// Delete question
router.delete('/:questionId', [
  param('questionId').isMongoId()
], async (req, res) => {
  try {
    const { questionId } = req.params;
    
    // Find the question and verify ownership
    const question = await Question.findById(questionId).populate('exam');
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Verify the exam belongs to the admin
    if (question.exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Question.findByIdAndDelete(questionId);

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question'
    });
  }
});

module.exports = router;




// const express = require('express');
// const { body, validationResult, param } = require('express-validator');
// const { auth, requireRole } = require('../middleware/auth');
// const Question = require('../models/Question');
// const Exam = require('../models/Exam');

// const router = express.Router();

// // All routes require authentication and admin role
// router.use(auth, requireRole(['admin']));

// // Get questions for an exam
// router.get('/exam/:examId', [
//   param('examId').isMongoId()
// ], async (req, res) => {
//   try {
//     const { page = 1, limit = 50, category, difficulty } = req.query;
    
//     const filter = { exam: req.params.examId };
//     if (category) filter.category = category;
//     if (difficulty) filter.difficulty = difficulty;

//     const questions = await Question.find(filter)
//       .populate('exam', 'title')
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await Question.countDocuments(filter);

//     res.json({
//       success: true,
//       data: {
//         questions,
//         pagination: {
//           current: parseInt(page),
//           pages: Math.ceil(total / limit),
//           total
//         }
//       }
//     });
//   } catch (error) {
//     console.error('Get questions error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch questions'
//     });
//   }
// });

// // Create new question
// router.post('/', [
//   body('exam').isMongoId(),
//   body('type').isIn(['mcq-single', 'mcq-multiple', 'true-false', 'short-answer']),
//   body('questionText').notEmpty().trim(),
//   body('points').optional().isFloat({ min: 0 }),
//   body('difficulty').optional().isIn(['easy', 'medium', 'hard'])
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array()
//       });
//     }

//     // Verify exam exists and user owns it
//     const exam = await Exam.findOne({
//       _id: req.body.exam,
//       createdBy: req.user._id
//     });

//     if (!exam) {
//       return res.status(404).json({
//         success: false,
//         message: 'Exam not found or access denied'
//       });
//     }

//     const question = new Question(req.body);
//     await question.save();

//     await question.populate('exam', 'title');

//     res.status(201).json({
//       success: true,
//       message: 'Question created successfully',
//       data: { question }
//     });
//   } catch (error) {
//     console.error('Create question error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create question'
//     });
//   }
// });

// // Bulk create questions
// router.post('/bulk', [
//   body('exam').isMongoId(),
//   body('questions').isArray({ min: 1 })
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array()
//       });
//     }

//     const { exam: examId, questions } = req.body;

//     // Verify exam exists and user owns it
//     const exam = await Exam.findOne({
//       _id: examId,
//       createdBy: req.user._id
//     });

//     if (!exam) {
//       return res.status(404).json({
//         success: false,
//         message: 'Exam not found or access denied'
//       });
//     }

//     // Add exam ID to each question
//     const questionsWithExam = questions.map(q => ({
//       ...q,
//       exam: examId
//     }));

//     const createdQuestions = await Question.insertMany(questionsWithExam);

//     res.status(201).json({
//       success: true,
//       message: `${createdQuestions.length} questions created successfully`,
//       data: { questions: createdQuestions }
//     });
//   } catch (error) {
//     console.error('Bulk create questions error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create questions'
//     });
//   }
// });

// module.exports = router;