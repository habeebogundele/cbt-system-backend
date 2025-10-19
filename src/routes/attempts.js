const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');
const Question = require('../models/Question');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Save answer during exam
router.post('/:attemptId/answer', [
  param('attemptId').isMongoId(),
  body('questionId').isMongoId(),
  body('answer').notEmpty()
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

    const { attemptId } = req.params;
    const { questionId, answer, timeSpent } = req.body;

    // Find the attempt
    const attempt = await Attempt.findOne({
      _id: attemptId,
      student: req.user._id,
      status: 'in-progress'
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found or already submitted'
      });
    }

    // Find the question
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if answer already exists
    const existingAnswerIndex = attempt.answers.findIndex(
      a => a.question.toString() === questionId
    );

    let isCorrect = false;
    let scoreAwarded = 0;

    // Auto-grade objective questions
    if (question.type !== 'short-answer') {
      isCorrect = question.validateAnswer(answer);
      scoreAwarded = isCorrect ? question.points : 0;
    }

    const answerData = {
      question: questionId,
      studentAnswer: answer,
      isCorrect: question.type !== 'short-answer' ? isCorrect : null,
      scoreAwarded,
      timeSpent: timeSpent || 0
    };

    if (existingAnswerIndex > -1) {
      // Update existing answer
      attempt.answers[existingAnswerIndex] = answerData;
    } else {
      // Add new answer
      attempt.answers.push(answerData);
    }

    await attempt.save();

    res.json({
      success: true,
      message: 'Answer saved successfully',
      data: {
        isCorrect,
        scoreAwarded
      }
    });
  } catch (error) {
    console.error('Save answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save answer'
    });
  }
});

// Submit exam attempt
router.post('/:attemptId/submit', [
  param('attemptId').isMongoId()
], async (req, res) => {
  try {
    const { attemptId } = req.params;

    // Find and validate attempt
    const attempt = await Attempt.findOne({
      _id: attemptId,
      student: req.user._id
    }).populate('exam');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Attempt already submitted'
      });
    }

    // Calculate final scores
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Get all questions for this exam to calculate max possible score
    const questions = await Question.find({ exam: attempt.exam._id });
    maxPossibleScore = questions.reduce((sum, q) => sum + q.points, 0);

    // Calculate score from answers
    for (let answer of attempt.answers) {
      const question = await Question.findById(answer.question);
      if (!question) continue;

      // For short answers that weren't auto-graded, set score to 0 initially
      if (question.type === 'short-answer' && !answer.manuallyGraded) {
        answer.scoreAwarded = 0;
        answer.isCorrect = null;
      }

      totalScore += answer.scoreAwarded || 0;
    }

    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const passed = percentage >= attempt.exam.passMark;

    // Update attempt
    attempt.submittedAt = new Date();
    attempt.totalScore = totalScore;
    attempt.maxPossibleScore = maxPossibleScore;
    attempt.percentage = Math.round(percentage * 100) / 100; // Round to 2 decimal places
    attempt.passed = passed;
    attempt.status = attempt.exam.showResults ? 'graded' : 'submitted';
    attempt.timeRemaining = req.body.timeRemaining || 0;

    await attempt.save();

    res.json({
      success: true,
      message: 'Exam submitted successfully',
      data: {
        attempt,
        result: {
          totalScore,
          maxPossibleScore,
          percentage: attempt.percentage,
          passed,
          timeSpent: attempt.duration
        }
      }
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit exam'
    });
  }
});

// Get attempt details
router.get('/:attemptId', [
  param('attemptId').isMongoId()
], async (req, res) => {
  try {
    const attempt = await Attempt.findOne({
      _id: req.params.attemptId,
      $or: [
        { student: req.user._id }, // Student can see their own attempts
        { 'exam.createdBy': req.user._id } // Admin can see attempts for their exams
      ]
    })
    .populate('student', 'profile.name email')
    .populate('exam', 'title description passMark showResults')
    .populate('answers.question');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    // Hide correct answers if results shouldn't be shown to student
    if (req.user.role === 'student' && !attempt.exam.showResults) {
      attempt.answers.forEach(answer => {
        if (answer.question) {
          answer.question.correctAnswer = undefined;
          answer.question.explanation = undefined;
        }
      });
    }

    res.json({
      success: true,
      data: { attempt }
    });
  } catch (error) {
    console.error('Get attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attempt'
    });
  }
});

// Get user's attempts for an exam
router.get('/exam/:examId', [
  param('examId').isMongoId()
], async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const filter = { exam: req.params.examId };
    
    // Students can only see their own attempts
    if (req.user.role === 'student') {
      filter.student = req.user._id;
    }

    const attempts = await Attempt.find(filter)
      .populate('student', 'profile.name email')
      .populate('exam', 'title')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attempt.countDocuments(filter);

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attempts'
    });
  }
});


// Get student's own attempts across all exams
router.get('/student/my-attempts', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const attempts = await Attempt.find({ student: req.user._id })
      .populate('exam', 'title description')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attempt.countDocuments({ student: req.user._id });

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get student attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attempts'
    });
  }
});

module.exports = router;