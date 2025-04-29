const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
    index: true // For faster queries
  },
  seatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat',
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  requiresAction: {
    type: Boolean,
    default: false,
    index: true // Important for finding pending notifications
  },
  actionResponse: {
    type: String,
    enum: ['pending', 'extend', 'release', 'AutoRelease', 'expired'],
    default: 'pending'
  },
  deadline: {
    type: Date,
    required: false
  },
  notificationType: {
    type: String,
    enum: ['initial', 'reminder', 'AutoRelease'],
    default: 'initial'
  }
}, { timestamps: true });

module.exports = mongoose.model('SeatReservationNotification', notificationSchema);
