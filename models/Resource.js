const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    year: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['Notes', 'Previous Papers', 'Lab Manual', 'Academic PDF', 'Useful Links', 'Other'],
      default: 'Notes'
    },
    fileUrl: {
      type: String,
      required: [true, 'Resource file URL or reference link is required'],
      trim: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Resource', resourceSchema);
