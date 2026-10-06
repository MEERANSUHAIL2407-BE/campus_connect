const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/feedback
 * @desc    Get feedback list (Admins see all; Students/Faculty see their own feedback)
 * @access  Private (Authenticated)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, status } = req.query;

    let query = {};

    // If not admin, only show user's own feedback
    if (req.user.role !== 'admin') {
      query.submittedBy = req.user._id;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const feedbacks = await Feedback.find(query)
      .populate('submittedBy', 'name email role department')
      .sort({ createdAt: -1 });

    // Mask name for anonymous feedback if viewed by others
    const sanitizedFeedback = feedbacks.map((fb) => {
      const fbObj = fb.toObject();
      if (fbObj.anonymous && req.user.role === 'admin') {
        fbObj.submittedBy = {
          name: 'Anonymous Student',
          email: 'hidden',
          role: 'student',
          department: fbObj.submittedBy?.department || 'N/A'
        };
      }
      return fbObj;
    });

    return res.status(200).json({
      success: true,
      count: sanitizedFeedback.length,
      feedbacks: sanitizedFeedback
    });
  } catch (error) {
    console.error('Fetch Feedback Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback.'
    });
  }
});

/**
 * @route   POST /api/feedback
 * @desc    Submit new feedback
 * @access  Private (Authenticated)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { subject, category, description, rating, anonymous } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Feedback subject and description are required.'
      });
    }

    const feedback = await Feedback.create({
      subject: subject.trim(),
      category: category || 'Academics',
      description: description.trim(),
      rating: Number(rating) || 5,
      anonymous: Boolean(anonymous),
      submittedBy: req.user._id,
      status: 'Pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your feedback has been submitted successfully.',
      feedback
    });
  } catch (error) {
    console.error('Create Feedback Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit feedback.'
    });
  }
});

/**
 * @route   PUT /api/feedback/:id
 * @desc    Update feedback status and admin response
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, adminResponse } = req.body;

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found.'
      });
    }

    if (status) feedback.status = status;
    if (adminResponse !== undefined) feedback.adminResponse = adminResponse.trim();

    await feedback.save();

    // Notify the user who submitted the feedback if not anonymous
    if (!feedback.anonymous && feedback.submittedBy) {
      await Notification.create({
        user: feedback.submittedBy,
        title: 'Feedback Status Updated',
        message: `Your feedback regarding "${feedback.subject}" has been marked as "${feedback.status}".`,
        type: 'General',
        link: 'feedback.html'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback updated successfully!',
      feedback
    });
  } catch (error) {
    console.error('Update Feedback Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update feedback status.'
    });
  }
});

/**
 * @route   DELETE /api/feedback/:id
 * @desc    Delete feedback item
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found.'
      });
    }

    await Feedback.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully.'
    });
  } catch (error) {
    console.error('Delete Feedback Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete feedback.'
    });
  }
});

module.exports = router;
