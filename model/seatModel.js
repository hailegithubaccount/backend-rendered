const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema({
  seatNumber: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ["book", "independent"],
    required: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
    minlength: [3, "Location must be at least 3 characters"],
    maxlength: [50, "Location cannot exceed 50 characters"],
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  reservedAt: {
    type: Date,
    default: null,
  },
  releasedAt: {
    type: Date,
    default: null,
  },
  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reservationDuration: {
    type: Number,
    default: 2, // Notification appears after 2 minutes
    min: 1 // Minimum 1 minute
  },
  gracePeriod: {
    type: Number,
    default: 1, // 1 minute grace period after notification
    min: 1
  },
  currentDeadline: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Add index for frequently queried fields
seatSchema.index({ isAvailable: 1 });
seatSchema.index({ reservedBy: 1 });
seatSchema.index({ type: 1, location: 1 });

const Seat = mongoose.model("Seat", seatSchema);

module.exports = Seat;