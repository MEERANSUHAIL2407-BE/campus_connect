const express = require('express');
const router = express.Router();
const LostFound = require('../models/LostFound');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/lostfound
 * @desc    Get all lost and found items with search, type (Lost/Found), and status filters
 * @access  Public (or Authenticated)
 */
router.get('/', async (req, res) => {
  try {
    const { search, type, status } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { itemName: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { location: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (type && type !== 'All') {
      query.type = type;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const items = await LostFound.find(query)
      .populate('postedBy', 'name email role phone department')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Fetch Lost & Found Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Lost & Found listings.'
    });
  }
});

/**
 * @route   POST /api/lostfound
 * @desc    Post a new lost or found item
 * @access  Private (Authenticated)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, itemName, description, date, location, contact, image } = req.body;

    if (!type || !itemName || !description || !date || !location || !contact) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields (Item Name, Type, Description, Date, Location, Contact).'
      });
    }

    const item = await LostFound.create({
      type,
      itemName: itemName.trim(),
      description: description.trim(),
      date,
      location: location.trim(),
      contact: contact.trim(),
      image: image ? image.trim() : '',
      status: 'Open',
      postedBy: req.user._id
    });

    const populatedItem = await item.populate('postedBy', 'name email role phone department');

    return res.status(201).json({
      success: true,
      message: `${type} item posted successfully!`,
      item: populatedItem
    });
  } catch (error) {
    console.error('Create LostFound Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to post lost/found item.'
    });
  }
});

/**
 * @route   PUT /api/lostfound/:id
 * @desc    Update item status (e.g. resolve) or item details
 * @access  Private (Poster or Admin)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const item = await LostFound.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item listing not found.'
      });
    }

    // Only owner or admin can edit
    if (req.user.role !== 'admin' && item.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this listing.'
      });
    }

    const { type, itemName, description, date, location, contact, image, status } = req.body;

    if (type) item.type = type;
    if (itemName) item.itemName = itemName.trim();
    if (description) item.description = description.trim();
    if (date) item.date = date;
    if (location) item.location = location.trim();
    if (contact) item.contact = contact.trim();
    if (image !== undefined) item.image = image.trim();
    if (status) item.status = status;

    await item.save();
    const updated = await item.populate('postedBy', 'name email role phone department');

    return res.status(200).json({
      success: true,
      message: 'Item listing updated successfully!',
      item: updated
    });
  } catch (error) {
    console.error('Update LostFound Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update item listing.'
    });
  }
});

/**
 * @route   DELETE /api/lostfound/:id
 * @desc    Delete a lost/found listing
 * @access  Private (Poster or Admin)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const item = await LostFound.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item listing not found.'
      });
    }

    // Only owner or admin can delete
    if (req.user.role !== 'admin' && item.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this listing.'
      });
    }

    await LostFound.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Item listing deleted successfully.'
    });
  } catch (error) {
    console.error('Delete LostFound Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete item listing.'
    });
  }
});

module.exports = router;
