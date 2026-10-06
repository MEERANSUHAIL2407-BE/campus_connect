const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for logged-in user (including broadcast notifications)
 * @access  Private (Authenticated)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { user: req.user._id },
        { user: null } // Global broadcasts
      ]
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    console.error('Fetch Notifications Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications.'
    });
  }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private (Authenticated)
 */
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.'
      });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (error) {
    console.error('Update Notification Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification.'
    });
  }
});

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all user notifications as read
 * @access  Private (Authenticated)
 */
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        $or: [{ user: req.user._id }, { user: null }],
        isRead: false
      },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    console.error('Mark All Read Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read.'
    });
  }
});

/**
 * @route   POST /api/notifications
 * @desc    Send broadcast or specific notification
 * @access  Private (Admin only)
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, message, type, userId, link } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Notification title and message are required.'
      });
    }

    const notification = await Notification.create({
      user: userId || null,
      title: title.trim(),
      message: message.trim(),
      type: type || 'System',
      link: link || ''
    });

    return res.status(201).json({
      success: true,
      message: 'Notification dispatched successfully!',
      notification
    });
  } catch (error) {
    console.error('Dispatch Notification Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send notification.'
    });
  }
});

module.exports = router;
