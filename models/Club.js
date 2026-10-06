const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Club name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Club name cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Club description is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Club category is required'],
      trim: true
    },
    coordinator: {
      type: String,
      default: 'Faculty Coordinator',
      trim: true
    },
    studentCoordinator: {
      type: String,
      default: 'Student Lead',
      trim: true
    },
    meetingLocation: {
      type: String,
      default: 'Campus Activity Center',
      trim: true
    },
    meetingSchedule: {
      type: String,
      default: 'Weekly',
      trim: true
    },
    contactEmail: {
      type: String,
      trim: true,
      default: ''
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Club', clubSchema);
