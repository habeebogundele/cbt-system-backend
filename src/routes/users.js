const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// All routes require authentication and admin role
router.use(auth, requireRole(['admin']));

// Get all users with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, suspended } = req.query;
    
    const filter = {};
    
    if (role) filter.role = role;
    if (suspended !== undefined) filter.isSuspended = suspended === 'true';
    
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.name': { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Update user (suspend, change role, etc.)
router.put('/:userId', [
  param('userId').isMongoId(),
  body('isSuspended').optional().isBoolean(),
  body('role').optional().isIn(['student', 'admin'])
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

    const { userId } = req.params;
    const updateData = { ...req.body };

    // Don't allow admins to modify their own role/suspension status
    if (userId === req.user._id.toString()) {
      delete updateData.role;
      delete updateData.isSuspended;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Reset user password (admin function)
router.post('/:userId/reset-password', [
  param('userId').isMongoId()
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          suspended: {
            $sum: { $cond: ['$isSuspended', 1, 0] }
          }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isSuspended: false });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        byRole: userStats,
        suspendedUsers: await User.countDocuments({ isSuspended: true })
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

module.exports = router;