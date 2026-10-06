const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Announcement = require('../models/Announcement');
const Event = require('../models/Event');
const Club = require('../models/Club');
const Resource = require('../models/Resource');
const LostFound = require('../models/LostFound');
const Feedback = require('../models/Feedback');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard metrics & counters for admin/faculty
 * @access  Private (Authenticated)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalFaculty,
      totalAnnouncements,
      totalEvents,
      totalClubs,
      totalResources,
      totalFeedback,
      totalLostFound
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'faculty' }),
      Announcement.countDocuments(),
      Event.countDocuments(),
      Club.countDocuments(),
      Resource.countDocuments(),
      Feedback.countDocuments(),
      LostFound.countDocuments()
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalStudents,
        totalFaculty,
        totalAnnouncements,
        totalEvents,
        totalClubs,
        totalResources,
        totalFeedback,
        totalLostFound
      }
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute system statistics.'
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all registered users with search and role filter
 * @access  Private (Admin only)
 */
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { search, role } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { studentId: { $regex: search.trim(), $options: 'i' } },
        { department: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (role && role !== 'All') {
      query.role = role;
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Admin Users Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user list.'
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update a user's role (e.g. promote to faculty or admin)
 * @access  Private (Admin only)
 */
router.put('/users/:id/role', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['student', 'faculty', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified. Allowed values: student, faculty, admin.'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Protect against self-demotion if last admin
    if (user._id.toString() === req.user._id.toString() && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote yourself as you are the only administrator.'
        });
      }
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.name}'s role updated to ${role}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update Role Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role.'
    });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user account
 * @access  Private (Admin only)
 */
router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account.'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: `User account (${user.email}) deleted successfully.`
    });
  } catch (error) {
    console.error('Delete User Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user account.'
    });
  }
});

module.exports = router;
