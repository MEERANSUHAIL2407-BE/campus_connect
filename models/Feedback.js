const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: [true, 'Feedback subject is required'],
      trim: true,
      maxlength: [150, 'Subject cannot exceed 150 characters']
    },
    category: {
      type: String,
      enum: ['Academics', 'Faculty', 'Infrastructure', 'Canteen', 'Transport', 'Library', 'Hostel', 'Events', 'Other'],
      default: 'Academics'
    },
    description: {
      type: String,
      required: [true, 'Feedback description is required'],
      trim: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    anonymous: {
      type: Boolean,
      default: false
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Under Review', 'Resolved'],
      default: 'Pending'
    },
    adminResponse: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
