const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/events
 * @desc    Get all events with search, category filter, and sort
 * @access  Public (or Authenticated)
 */
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { venue: { $regex: search.trim(), $options: 'i' } },
        { organizer: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name email role department')
      .populate('registeredUsers', 'name email studentId department year')
      .sort({ date: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Fetch Events Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch events.'
    });
  }
});

/**
 * @route   POST /api/events
 * @desc    Create a new event
 * @access  Private (Faculty & Admin)
 */
router.post('/', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      startTime,
      endTime,
      venue,
      organizer,
      category,
      maxParticipants,
      registrationDeadline
    } = req.body;

    if (!title || !description || !date || !startTime || !endTime || !venue || !organizer) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required event details.'
      });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      date,
      startTime,
      endTime,
      venue: venue.trim(),
      organizer: organizer.trim(),
      category: category || 'Technical',
      maxParticipants: Number(maxParticipants) || 100,
      registrationDeadline: registrationDeadline || '',
      createdBy: req.user._id,
      registeredUsers: []
    });

    const populatedEvent = await event.populate('createdBy', 'name email role department');

    // Create a broadcast notification
    await Notification.create({
      user: null, // Broadcast
      title: `New Event: ${event.title}`,
      message: `Join upcoming event on ${event.date} at ${event.venue}. Organized by ${event.organizer}.`,
      type: 'Event',
      link: 'events.html'
    });

    return res.status(201).json({
      success: true,
      message: 'Event created successfully!',
      event: populatedEvent
    });
  } catch (error) {
    console.error('Create Event Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create event.'
    });
  }
});

/**
 * @route   PUT /api/events/:id
 * @desc    Update an event
 * @access  Private (Admin or Creator Faculty)
 */
router.put('/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    if (req.user.role === 'faculty' && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit events you have created.'
      });
    }

    const {
      title,
      description,
      date,
      startTime,
      endTime,
      venue,
      organizer,
      category,
      maxParticipants,
      registrationDeadline
    } = req.body;

    if (title) event.title = title.trim();
    if (description) event.description = description.trim();
    if (date) event.date = date;
    if (startTime) event.startTime = startTime;
    if (endTime) event.endTime = endTime;
    if (venue) event.venue = venue.trim();
    if (organizer) event.organizer = organizer.trim();
    if (category) event.category = category;
    if (maxParticipants) event.maxParticipants = Number(maxParticipants);
    if (registrationDeadline !== undefined) event.registrationDeadline = registrationDeadline;

    await event.save();
    const updated = await event.populate('createdBy', 'name email role department');

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully!',
      event: updated
    });
  } catch (error) {
    console.error('Update Event Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update event.'
    });
  }
});

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete an event
 * @access  Private (Admin or Creator Faculty)
 */
router.delete('/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    if (req.user.role === 'faculty' && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete events you have created.'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully.'
    });
  } catch (error) {
    console.error('Delete Event Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete event.'
    });
  }
});

/**
 * @route   POST /api/events/:id/register
 * @desc    Register logged-in student for an event
 * @access  Private (Authenticated)
 */
router.post('/:id/register', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    // Check if already registered
    const isAlreadyRegistered = event.registeredUsers.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (isAlreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event.'
      });
    }

    // Check capacity limit
    if (event.registeredUsers.length >= event.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Sorry, this event has reached maximum capacity.'
      });
    }

    event.registeredUsers.push(req.user._id);
    await event.save();

    // Create user-specific confirmation notification
    await Notification.create({
      user: req.user._id,
      title: `Event Registration Confirmed`,
      message: `You have successfully registered for "${event.title}" on ${event.date}.`,
      type: 'Event',
      link: 'events.html'
    });

    return res.status(200).json({
      success: true,
      message: 'Registered for event successfully!',
      registeredCount: event.registeredUsers.length
    });
  } catch (error) {
    console.error('Event Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register for event.'
    });
  }
});

/**
 * @route   DELETE /api/events/:id/register
 * @desc    Cancel event registration
 * @access  Private (Authenticated)
 */
router.delete('/:id/register', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const index = event.registeredUsers.indexOf(req.user._id);
    if (index === -1) {
      return res.status(400).json({
        success: false,
        message: 'You were not registered for this event.'
      });
    }

    event.registeredUsers.splice(index, 1);
    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Event registration cancelled successfully.',
      registeredCount: event.registeredUsers.length
    });
  } catch (error) {
    console.error('Cancel Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel registration.'
    });
  }
});

/**
 * @route   GET /api/events/:id/attendees
 * @desc    Get list of registered students for an event
 * @access  Private (Faculty & Admin)
 */
router.get('/:id/attendees', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      'registeredUsers',
      'name email studentId department year phone'
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    return res.status(200).json({
      success: true,
      eventTitle: event.title,
      totalAttendees: event.registeredUsers.length,
      attendees: event.registeredUsers
    });
  } catch (error) {
    console.error('Get Attendees Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attendees list.'
    });
  }
});

module.exports = router;
