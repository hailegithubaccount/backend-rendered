const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema({
  seatNumber: {
    type: String,
    required: true,
    unique: true, // Ensure each seat number is unique
  },
  type: {
    type: String,
    enum: ["book", "independent"], // "book" for A1-A20, "independent" for B1-B20
    required: true,
  },
  location: {
    type: String,
    required: true, // Location is mandatory for every seat
    trim: true, // Remove extra whitespace
    minlength: [3, "Location must be at least 3 characters"],
    maxlength: [50, "Location cannot exceed 50 characters"],
  },
  isAvailable: {
    type: Boolean,
    default: true, // By default, the seat is available
  },
  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users", // Reference to the User model (student)
    default: null, // Initially, the seat is not reserved
  },
  reservedAt: {
    type: Date,
    default: null, // Initially, the seat is not reserved
  },
  releasedAt: {
    type: Date,
    default: null, // Initially, the seat is not released
  },
  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users", // Reference to the User model (library-staff)
    required: true, // Ensure every seat is managed by someone
  },
  isConfirmed: { type: Boolean, default: false }
});

const Seat = mongoose.model("Seat", seatSchema);

module.exports = Seat;