// models/SeatReservationNotification.js
const mongoose = require('mongoose');

const seatReservationNotificationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat',
    required: true
  },
  message: {
    type: String,
    required: true,
    default: "Welcome! Have a nice read at your reserved seat."
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('SeatReservationNotification', seatReservationNotificationSchema);