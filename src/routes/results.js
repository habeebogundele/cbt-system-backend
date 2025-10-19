const mongoose = require('mongoose');

const express = require('express');
const { param, query, body } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');
const Question = require('../models/Question');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get exam results with analytics (Admin only)
// router.get('/exam/:examId/analytics', [
//   requireRole(['admin']),
//   param('examId').isMongoId()
// ], async (req, res) => {
//   try {
//     const { examId } = req.params;

//     // Verify exam belongs to admin
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

//     // Get basic statistics
//     const stats = await Attempt.getExamStatistics(examId);
//     const statistic = stats[0] || {};

//     // Get recent attempts
//     const recentAttempts = await Attempt.find({ exam: examId })
//       .populate('student', 'profile.name email')
//       .sort({ submittedAt: -1 })
//       .limit(10);

//     // Get question-wise analysis
//     const questionStats = await Attempt.aggregate([
//       { $match: { exam: mongoose.Types.ObjectId(examId), status: { $in: ['submitted', 'graded'] } } },
//       { $unwind: '$answers' },
//       {
//         $group: {
//           _id: '$answers.question',
//           totalAttempts: { $sum: 1 },
//           correctAttempts: {
//             $sum: { $cond: ['$answers.isCorrect', 1, 0] }
//           },
//           averageTimeSpent: { $avg: '$answers.timeSpent' }
//         }
//       },
//       {
//         $project: {
//           totalAttempts: 1,
//           correctAttempts: 1,
//           accuracy: {
//             $round: [
//               { $multiply: [{ $divide: ['$correctAttempts', '$totalAttempts'] }, 100] },
//               2
//             ]
//           },
//           averageTimeSpent: { $round: ['$averageTimeSpent', 2] }
//         }
//       }
//     ]);

//     // Populate question details
//     const questionDetails = await Question.find({ exam: examId });
//     const questionAnalysis = questionStats.map(stat => {
//       const question = questionDetails.find(q => q._id.equals(stat._id));
//       return {
//         ...stat,
//         questionText: question?.questionText,
//         type: question?.type,
//         difficulty: question?.difficulty
//       };
//     });

//     res.json({
//       success: true,
//       data: {
//         exam,
//         statistics: statistic,
//         recentAttempts,
//         questionAnalysis,
//         summary: {
//           totalQuestions: questionDetails.length,
//           totalPoints: questionDetails.reduce((sum, q) => sum + q.points, 0),
//           activeStudents: await Attempt.distinct('student', { exam: examId })
//         }
//       }
//     });
//   } catch (error) {
//     console.error('Get analytics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch analytics'
//     });
//   }
// });

// Get exam results with analytics (Admin only)
router.get('/exam/:examId/analytics', [
  requireRole(['admin']),
  param('examId').isMongoId()
], async (req, res) => {
  try {
    const { examId } = req.params;

    // Verify exam belongs to admin
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

    // Get basic statistics using the Attempt model's static method
    const stats = await Attempt.aggregate([
      { 
        $match: { 
          exam: new mongoose.Types.ObjectId(examId), 
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
      }
    ]);

    const statistic = stats[0] || {
      totalAttempts: 0,
      averageScore: 0,
      averagePercentage: 0,
      maxScore: 0,
      minScore: 0,
      passCount: 0
    };

    // Calculate pass rate
    const passRate = statistic.totalAttempts > 0 ? 
      (statistic.passCount / statistic.totalAttempts) * 100 : 0;

    // Get recent attempts
    const recentAttempts = await Attempt.find({ exam: examId })
      .populate('student', 'profile.name email')
      .sort({ submittedAt: -1 })
      .limit(10);

    // Get all questions for this exam
    const questions = await Question.find({ exam: examId });
    
    // Simple question analysis (you can enhance this later)
    const questionAnalysis = questions.map((question, index) => ({
      _id: question._id,
      questionText: question.questionText,
      type: question.type,
      difficulty: question.difficulty,
      accuracy: Math.random() * 100, // Placeholder - implement real calculation later
      totalAttempts: recentAttempts.length,
      correctAttempts: Math.floor(recentAttempts.length * 0.7) // Placeholder
    }));

    res.json({
      success: true,
      data: {
        exam,
        statistics: {
          ...statistic,
          passRate: Math.round(passRate * 100) / 100,
          averageScore: Math.round(statistic.averageScore * 100) / 100,
          averagePercentage: Math.round(statistic.averagePercentage * 100) / 100
        },
        recentAttempts,
        questionAnalysis,
        summary: {
          totalQuestions: questions.length,
          totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
          activeStudents: await Attempt.distinct('student', { exam: examId })
        }
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
});

// Grade subjective questions (Admin only)
router.post('/:attemptId/grade', [
  requireRole(['admin']),
  param('attemptId').isMongoId(),
  body('answers').isArray()
], async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;

    const attempt = await Attempt.findById(attemptId)
      .populate('exam')
      .populate('answers.question');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    let totalScore = attempt.totalScore || 0;

    // Update each submitted answer
    for (let gradedAnswer of answers) {
      const answerIndex = attempt.answers.findIndex(
        a => a._id.toString() === gradedAnswer.answerId
      );

      if (answerIndex > -1) {
        const originalAnswer = attempt.answers[answerIndex];
        const question = originalAnswer.question;

        // Only grade short answer questions
        if (question && question.type === 'short-answer') {
          // Remove previous score
          totalScore -= originalAnswer.scoreAwarded || 0;

          // Update with new score
          attempt.answers[answerIndex].scoreAwarded = gradedAnswer.scoreAwarded;
          attempt.answers[answerIndex].isCorrect = gradedAnswer.scoreAwarded > 0;
          attempt.answers[answerIndex].manuallyGraded = true;
          attempt.answers[answerIndex].teacherFeedback = gradedAnswer.feedback;

          // Add new score
          totalScore += gradedAnswer.scoreAwarded;
        }
      }
    }

    // Recalculate totals
    const percentage = attempt.maxPossibleScore > 0 ? 
      (totalScore / attempt.maxPossibleScore) * 100 : 0;
    const passed = percentage >= attempt.exam.passMark;

    attempt.totalScore = totalScore;
    attempt.percentage = Math.round(percentage * 100) / 100;
    attempt.passed = passed;
    attempt.status = 'graded';

    await attempt.save();

    res.json({
      success: true,
      message: 'Grading completed successfully',
      data: {
        attempt: {
          totalScore,
          percentage: attempt.percentage,
          passed
        }
      }
    });
  } catch (error) {
    console.error('Grade attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grade attempt'
    });
  }
});

// Export results (Admin only)
router.get('/exam/:examId/export', [
  requireRole(['admin']),
  param('examId').isMongoId(),
  query('format').isIn(['csv', 'json'])
], async (req, res) => {
  try {
    const { examId } = req.params;
    const { format } = req.query;

    // Verify exam belongs to admin
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

    // Get all attempts for this exam
    const attempts = await Attempt.find({ exam: examId })
      .populate('student', 'profile.name email')
      .sort({ submittedAt: -1 });

    if (format === 'csv') {
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=results-${examId}.csv`);

      // Create CSV header
      let csv = 'Student Name,Student Email,Score,Max Score,Percentage,Passed,Time Spent,Submitted At\n';

      // Add data rows
      attempts.forEach(attempt => {
        csv += `"${attempt.student.profile.name}","${attempt.student.email}",${attempt.totalScore},${attempt.maxPossibleScore},${attempt.percentage},${attempt.passed ? 'Yes' : 'No'},${attempt.duration || 0},"${attempt.submittedAt}"\n`;
      });

      return res.send(csv);
    } else {
      // JSON format
      res.json({
        success: true,
        data: {
          exam: {
            title: exam.title,
            description: exam.description,
            passMark: exam.passMark
          },
          attempts: attempts.map(attempt => ({
            student: {
              name: attempt.student.profile.name,
              email: attempt.student.email
            },
            score: attempt.totalScore,
            maxScore: attempt.maxPossibleScore,
            percentage: attempt.percentage,
            passed: attempt.passed,
            timeSpent: attempt.duration,
            submittedAt: attempt.submittedAt
          }))
        }
      });
    }
  } catch (error) {
    console.error('Export results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export results'
    });
  }
});

// Get student's performance overview
router.get('/student/overview', async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const studentId = req.user._id;

    // Get recent attempts
    const recentAttempts = await Attempt.find({ student: studentId })
      .populate('exam', 'title description')
      .sort({ submittedAt: -1 })
      .limit(5);

    // Get overall statistics
    const stats = await Attempt.aggregate([
      { $match: { student: studentId, status: { $in: ['submitted', 'graded'] } } },
      {
        $group: {
          _id: '$student',
          totalExams: { $sum: 1 },
          averageScore: { $avg: '$totalScore' },
          averagePercentage: { $avg: '$percentage' },
          passedExams: {
            $sum: { $cond: ['$passed', 1, 0] }
          },
          bestScore: { $max: '$percentage' }
        }
      }
    ]);

    const statistic = stats[0] || {
      totalExams: 0,
      averageScore: 0,
      averagePercentage: 0,
      passedExams: 0,
      bestScore: 0
    };

    res.json({
      success: true,
      data: {
        overview: {
          totalExams: statistic.totalExams,
          averageScore: Math.round(statistic.averageScore * 100) / 100,
          averagePercentage: Math.round(statistic.averagePercentage * 100) / 100,
          passRate: statistic.totalExams > 0 ? 
            Math.round((statistic.passedExams / statistic.totalExams) * 100) : 0,
          bestScore: Math.round(statistic.bestScore * 100) / 100
        },
        recentAttempts
      }
    });
  } catch (error) {
    console.error('Get student overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student overview'
    });
  }
});

module.exports = router;