const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get all exams (with filtering and pagination)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const filter = {};

    // Admin sees all exams, students only see published exams
    if (req.user.role === 'student') {
      filter.status = 'published';
      filter.availableFrom = { $lte: new Date() };
      filter.availableTo = { $gte: new Date() };
    } else {
      if (status) filter.status = status;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const exams = await Exam.find(filter)
      .populate('createdBy', 'profile.name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Exam.countDocuments(filter);

    res.json({
      success: true,
      data: {
        exams,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exams'
    });
  }
});

// Get single exam
// router.get('/:id', [
//   param('id').isMongoId()
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid exam ID',
//         errors: errors.array()
//       });
//     }

//     const exam = await Exam.findById(req.params.id)
//       .populate('createdBy', 'profile.name email');

//     if (!exam) {
//       return res.status(404).json({
//         success: false,
//         message: 'Exam not found'
//       });
//     }

//     // Students can only access published exams
//     if (req.user.role === 'student' && exam.status !== 'published') {
//       return res.status(403).json({
//         success: false,
//         message: 'Access denied'
//       });
//     }

//     res.json({
//       success: true,
//       data: { exam }
//     });
//   } catch (error) {
//     console.error('Get exam error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch exam'
//     });
//   }
// });

// Get single exam - FIX THIS ENDPOINT
router.get('/:id', [
  param('id').isMongoId()
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

    const examId = req.params.id;
    console.log('Fetching exam:', examId, 'for user:', req.user._id); // Debug log

    let exam;
    
    if (req.user.role === 'admin') {
      // Admin can see any exam they created
      exam = await Exam.findOne({
        _id: examId,
        createdBy: req.user._id
      }).populate('createdBy', 'profile.name email');
    } else {
      // Student can only see published exams
      exam = await Exam.findOne({
        _id: examId,
        status: 'published'
      }).populate('createdBy', 'profile.name email');
    }

    if (!exam) {
      console.log('Exam not found:', examId); // Debug log
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    console.log('Exam found:', exam.title); // Debug log

    res.json({
      success: true,
      data: { exam }
    });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam'
    });
  }
});

// Create new exam (Admin only)
router.post('/', [
  requireRole(['admin']),
  body('title').notEmpty().trim(),
  body('duration').isInt({ min: 1 }),
  body('availableFrom').isISO8601(),
  body('availableTo').isISO8601(),
  body('passMark').optional().isFloat({ min: 0, max: 100 })
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

    const examData = {
      ...req.body,
      createdBy: req.user._id
    };

    const exam = new Exam(examData);
    await exam.save();

    await exam.populate('createdBy', 'profile.name email');

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: { exam }
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create exam'
    });
  }
});

// Start exam attempt
router.post('/:id/start', [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if user can take exam
    const canTake = await exam.canUserTakeExam(req.user._id);
    if (!canTake.canTake) {
      return res.status(403).json({
        success: false,
        message: canTake.reason
      });
    }

    // Get questions for the exam
    const questions = await Question.getExamQuestions(exam._id, {
      randomize: exam.isRandomized
    });
    // .select('-correctAnswer -explanation');

    // Create new attempt
    const attempt = new Attempt({
      student: req.user._id,
      exam: exam._id,
      startedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await attempt.save();

    res.json({
      success: true,
      message: 'Exam started successfully',
      data: {
        attempt,
        exam,
        questions,
        timeRemaining: exam.duration * 60 // Convert to seconds
      }
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start exam'
    });
  }
});

// Update exam (Admin only)

router.put('/:id', [
  requireRole(['admin']),
  param('id').isMongoId(),
  body('title').optional().notEmpty().trim(),
  body('duration').optional().isInt({ min: 1 }),
  body('availableFrom').optional().isISO8601(),
  body('availableTo').optional().isISO8601(),
  body('passMark').optional().isFloat({ min: 0, max: 100 })
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

    const { id } = req.params;

    // Verify exam exists and belongs to user
    const existingExam = await Exam.findOne({
      _id: id,
      createdBy: req.user._id
    });

    if (!existingExam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or access denied'
      });
    }

    // Update exam
    const updatedExam = await Exam.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('createdBy', 'profile.name email');

    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: { exam: updatedExam }
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exam'
    });
  }
});

// DELETE /api/exams/:id - Delete exam (admin only)
router.delete('/:id', [
  requireRole(['admin']),
  param('id').isMongoId()
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

    const { id } = req.params;
    console.log('Deleting exam:', id, 'by user:', req.user._id); // Debug log

    // Verify exam exists and belongs to user
    const exam = await Exam.findOne({
      _id: id,
      createdBy: req.user._id
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or access denied'
      });
    }

    // Delete all questions associated with this exam
    await Question.deleteMany({ exam: id });
    console.log('Deleted questions for exam:', id); // Debug log

    // Delete all attempts associated with this exam
    await Attempt.deleteMany({ exam: id });
    console.log('Deleted attempts for exam:', id); // Debug log

    // Delete the exam
    await Exam.findByIdAndDelete(id);
    console.log('Exam deleted successfully:', id); // Debug log

    res.json({
      success: true,
      message: 'Exam and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete exam: ' + error.message
    });
  }
});

module.exports = router;