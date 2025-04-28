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
    enum: ['pending', 'extend', 'release', 'Auto-release', 'expired'],
    default: 'pending'
  },
  deadline: {
    type: Date,
    required: true,
    index: true // For scheduling queries
  },
  notificationType: {
    type: String,
    enum: ['initial', 'reminder', 'release', 'extension'],
    default: 'initial'
  },
  metadata: {
    previousNotification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeatReservationNotification'
    },
    extensionCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Add compound indexes for faster lookups
notificationSchema.index({ studentId: 1, requiresAction: 1 });
notificationSchema.index({ seatId: 1, requiresAction: 1 });

// Pre-save hook to update updatedAt field manually if any modification
notificationSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// Static method to find active notifications for a specific seat
notificationSchema.statics.findActiveForSeat = function(seatId) {
  return this.findOne({
    seatId: seatId,
    requiresAction: true
  });
};

const SeatReservationNotification = mongoose.model('SeatReservationNotification', notificationSchema);

module.exports = SeatReservationNotification;
