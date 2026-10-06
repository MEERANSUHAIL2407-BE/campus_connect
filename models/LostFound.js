const mongoose = require('mongoose');

const lostFoundSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Lost', 'Found'],
      required: [true, 'Please specify if item is Lost or Found']
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [100, 'Item name cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    date: {
      type: String,
      required: [true, 'Date is required']
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true
    },
    contact: {
      type: String,
      required: [true, 'Contact details (email or phone) are required'],
      trim: true
    },
    image: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Open', 'Resolved'],
      default: 'Open'
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('LostFound', lostFoundSchema);
