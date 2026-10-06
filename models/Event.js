const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true
    },
    date: {
      type: String,
      required: [true, 'Event date is required']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required']
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true
    },
    organizer: {
      type: String,
      required: [true, 'Organizer is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Hackathon', 'Club Event'],
      default: 'Technical'
    },
    maxParticipants: {
      type: Number,
      default: 100,
      min: [1, 'Maximum participants must be at least 1']
    },
    registrationDeadline: {
      type: String,
      default: ''
    },
    registeredUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Event', eventSchema);
