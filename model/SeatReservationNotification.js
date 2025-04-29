const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
    index: true
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
    default: false
  },
  actionResponse: {
    type: String,
    enum: ['pending', 'extend', 'release', 'autoRelease', 'expired'],
    default: 'pending'
  },
  deadline: Date,
  notificationType: {
    type: String,
    enum: ['initial', 'reminder', 'autoRelease'],
    default: 'initial'
  }
}, { timestamps: true });

module.exports = mongoose.model('SeatReservationNotification', notificationSchema);
