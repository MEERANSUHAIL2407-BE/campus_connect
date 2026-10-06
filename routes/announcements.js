const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/announcements
 * @desc    Get all announcements with search, category, priority filters and sorting
 * @access  Public (or Authenticated)
 */
router.get('/', async (req, res) => {
  try {
    const { search, category, priority, sortBy } = req.query;

    let query = {};

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Filter by priority
    if (priority && priority !== 'All') {
      query.priority = priority;
    }

    // Sort order: default newest first
    let sort = { createdAt: -1 };
    if (sortBy === 'oldest') {
      sort = { createdAt: 1 };
    }

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name email role department')
      .sort(sort);

    return res.status(200).json({
      success: true,
      count: announcements.length,
      announcements
    });
  } catch (error) {
    console.error('Fetch Announcements Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements.'
    });
  }
});

/**
 * @route   POST /api/announcements
 * @desc    Create new announcement
 * @access  Private (Faculty & Admin only)
 */
router.post('/', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { title, description, category, priority, attachment } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required.'
      });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      description: description.trim(),
      category: category || 'General',
      priority: priority || 'Medium',
      attachment: attachment ? attachment.trim() : '',
      createdBy: req.user._id
    });

    const populatedAnnouncement = await announcement.populate('createdBy', 'name email role department');

    // Create a broadcast notification for campus users
    await Notification.create({
      user: null, // Broadcast to all
      title: `New Announcement: ${announcement.title}`,
      message: `${req.user.name} posted an announcement in ${announcement.category}.`,
      type: 'Announcement',
      link: 'announcements.html'
    });

    return res.status(201).json({
      success: true,
      message: 'Announcement published successfully!',
      announcement: populatedAnnouncement
    });
  } catch (error) {
    console.error('Create Announcement Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create announcement.'
    });
  }
});

/**
 * @route   PUT /api/announcements/:id
 * @desc    Update an announcement
 * @access  Private (Admin or Owner Faculty)
 */
router.put('/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found.'
      });
    }

    // Faculty can only edit their own announcements; Admin can edit any
    if (req.user.role === 'faculty' && announcement.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit announcements created by yourself.'
      });
    }

    const { title, description, category, priority, attachment } = req.body;
    if (title) announcement.title = title.trim();
    if (description) announcement.description = description.trim();
    if (category) announcement.category = category;
    if (priority) announcement.priority = priority;
    if (attachment !== undefined) announcement.attachment = attachment.trim();

    await announcement.save();
    const updated = await announcement.populate('createdBy', 'name email role department');

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully!',
      announcement: updated
    });
  } catch (error) {
    console.error('Update Announcement Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update announcement.'
    });
  }
});

/**
 * @route   DELETE /api/announcements/:id
 * @desc    Delete an announcement
 * @access  Private (Admin or Owner Faculty)
 */
router.delete('/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found.'
      });
    }

    // Faculty can only delete their own announcements; Admin can delete any
    if (req.user.role === 'faculty' && announcement.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete announcements created by yourself.'
      });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully.'
    });
  } catch (error) {
    console.error('Delete Announcement Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete announcement.'
    });
  }
});

module.exports = router;
