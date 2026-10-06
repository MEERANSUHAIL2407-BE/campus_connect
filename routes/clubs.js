const express = require('express');
const router = express.Router();
const Club = require('../models/Club');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/clubs
 * @desc    Get all clubs with search and category filter
 * @access  Public (or Authenticated)
 */
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { coordinator: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    const clubs = await Club.find(query)
      .populate('createdBy', 'name email role')
      .populate('members', 'name email studentId department year')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: clubs.length,
      clubs
    });
  } catch (error) {
    console.error('Fetch Clubs Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch clubs.'
    });
  }
});

/**
 * @route   POST /api/clubs
 * @desc    Create a new club
 * @access  Private (Faculty & Admin)
 */
router.post('/', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      coordinator,
      studentCoordinator,
      meetingLocation,
      meetingSchedule,
      contactEmail
    } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Club name, description, and category are required.'
      });
    }

    const existingClub = await Club.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existingClub) {
      return res.status(400).json({
        success: false,
        message: 'A club with this name already exists.'
      });
    }

    const club = await Club.create({
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      coordinator: coordinator ? coordinator.trim() : req.user.name,
      studentCoordinator: studentCoordinator ? studentCoordinator.trim() : '',
      meetingLocation: meetingLocation ? meetingLocation.trim() : 'Campus Center',
      meetingSchedule: meetingSchedule ? meetingSchedule.trim() : 'Weekly',
      contactEmail: contactEmail ? contactEmail.trim() : req.user.email,
      createdBy: req.user._id,
      members: []
    });

    const populatedClub = await club.populate('createdBy', 'name email role');

    // Send broadcast notification
    await Notification.create({
      user: null,
      title: `New Club Formed: ${club.name}`,
      message: `Join the newly formed ${club.name} (${club.category}) on Campus Connect!`,
      type: 'Club',
      link: 'clubs.html'
    });

    return res.status(201).json({
      success: true,
      message: 'Club created successfully!',
      club: populatedClub
    });
  } catch (error) {
    console.error('Create Club Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create club.'
    });
  }
});

/**
 * @route   PUT /api/clubs/:id
 * @desc    Update club details
 * @access  Private (Faculty & Admin)
 */
router.put('/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found.'
      });
    }

    const {
      name,
      description,
      category,
      coordinator,
      studentCoordinator,
      meetingLocation,
      meetingSchedule,
      contactEmail
    } = req.body;

    if (name) club.name = name.trim();
    if (description) club.description = description.trim();
    if (category) club.category = category.trim();
    if (coordinator) club.coordinator = coordinator.trim();
    if (studentCoordinator !== undefined) club.studentCoordinator = studentCoordinator.trim();
    if (meetingLocation) club.meetingLocation = meetingLocation.trim();
    if (meetingSchedule) club.meetingSchedule = meetingSchedule.trim();
    if (contactEmail !== undefined) club.contactEmail = contactEmail.trim();

    await club.save();
    const updated = await club.populate('createdBy', 'name email role');

    return res.status(200).json({
      success: true,
      message: 'Club updated successfully!',
      club: updated
    });
  } catch (error) {
    console.error('Update Club Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update club.'
    });
  }
});

/**
 * @route   DELETE /api/clubs/:id
 * @desc    Delete a club
 * @access  Private (Faculty & Admin)
 */
router.delete('/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found.'
      });
    }

    await Club.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Club deleted successfully.'
    });
  } catch (error) {
    console.error('Delete Club Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete club.'
    });
  }
});

/**
 * @route   POST /api/clubs/:id/join
 * @desc    Join a club
 * @access  Private (Authenticated)
 */
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found.'
      });
    }

    const isMember = club.members.some(
      (mId) => mId.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this club.'
      });
    }

    club.members.push(req.user._id);
    await club.save();

    // User notification
    await Notification.create({
      user: req.user._id,
      title: 'Club Membership Confirmed',
      message: `You are now an active member of ${club.name}!`,
      type: 'Club',
      link: 'clubs.html'
    });

    return res.status(200).json({
      success: true,
      message: `Welcome to ${club.name}! You are now a member.`,
      memberCount: club.members.length
    });
  } catch (error) {
    console.error('Join Club Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to join club.'
    });
  }
});

/**
 * @route   DELETE /api/clubs/:id/join
 * @desc    Leave a club
 * @access  Private (Authenticated)
 */
router.delete('/:id/join', authenticate, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found.'
      });
    }

    const index = club.members.indexOf(req.user._id);
    if (index === -1) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this club.'
      });
    }

    club.members.splice(index, 1);
    await club.save();

    return res.status(200).json({
      success: true,
      message: `You have left ${club.name}.`,
      memberCount: club.members.length
    });
  } catch (error) {
    console.error('Leave Club Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to leave club.'
    });
  }
});

module.exports = router;
