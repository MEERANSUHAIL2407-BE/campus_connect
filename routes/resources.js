const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/resources
 * @desc    Get all resources with search and filters (department, year, type, subject)
 * @access  Public (or Authenticated)
 */
router.get('/', async (req, res) => {
  try {
    const { search, department, year, type, subject } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { subject: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (department && department !== 'All') {
      query.department = department;
    }

    if (year && year !== 'All') {
      query.year = year;
    }

    if (type && type !== 'All') {
      query.type = type;
    }

    if (subject && subject !== 'All') {
      query.subject = { $regex: subject.trim(), $options: 'i' };
    }

    const resources = await Resource.find(query)
      .populate('uploadedBy', 'name email role department')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: resources.length,
      resources
    });
  } catch (error) {
    console.error('Fetch Resources Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch academic resources.'
    });
  }
});

/**
 * @route   POST /api/resources
 * @desc    Upload new resource
 * @access  Private (Faculty & Admin)
 */
router.post('/', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { title, description, subject, department, year, type, fileUrl } = req.body;

    if (!title || !subject || !department || !year || !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, subject, department, year, and file/link URL.'
      });
    }

    const resource = await Resource.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      subject: subject.trim(),
      department: department.trim(),
      year: year.trim(),
      type: type || 'Notes',
      fileUrl: fileUrl.trim(),
      uploadedBy: req.user._id
    });

    const populatedResource = await resource.populate('uploadedBy', 'name email role department');

    // Send broadcast notification for new resource
    await Notification.create({
      user: null,
      title: `New Study Resource Uploaded`,
      message: `"${resource.title}" (${resource.subject} - ${resource.department}) is now available.`,
      type: 'Resource',
      link: 'resources.html'
    });

    return res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully!',
      resource: populatedResource
    });
  } catch (error) {
    console.error('Create Resource Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload resource.'
    });
  }
});

/**
 * @route   PUT /api/resources/:id
 * @desc    Update resource details
 * @access  Private (Admin or Uploader Faculty)
 */
router.put('/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    if (req.user.role === 'faculty' && resource.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit resources uploaded by yourself.'
      });
    }

    const { title, description, subject, department, year, type, fileUrl } = req.body;

    if (title) resource.title = title.trim();
    if (description !== undefined) resource.description = description.trim();
    if (subject) resource.subject = subject.trim();
    if (department) resource.department = department.trim();
    if (year) resource.year = year.trim();
    if (type) resource.type = type;
    if (fileUrl) resource.fileUrl = fileUrl.trim();

    await resource.save();
    const updated = await resource.populate('uploadedBy', 'name email role department');

    return res.status(200).json({
      success: true,
      message: 'Resource updated successfully!',
      resource: updated
    });
  } catch (error) {
    console.error('Update Resource Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update resource.'
    });
  }
});

/**
 * @route   DELETE /api/resources/:id
 * @desc    Delete a resource
 * @access  Private (Admin or Uploader Faculty)
 */
router.delete('/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    if (req.user.role === 'faculty' && resource.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete resources uploaded by yourself.'
      });
    }

    await Resource.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Resource deleted successfully.'
    });
  } catch (error) {
    console.error('Delete Resource Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete resource.'
    });
  }
});

module.exports = router;
