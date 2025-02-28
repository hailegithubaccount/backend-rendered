const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
  {
    seatNumber: {
      type: String,
      required: [true, "Seat number is required"],
      maxlength: [10, "Seat number cannot exceed 10 characters"],
      minlength: [2, "Seat number must be at least 2 characters"],
      trim: true,
      unique: true, // Ensure each seat number is unique
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      maxlength: [50, "Location cannot exceed 50 characters"],
      minlength: [3, "Location must be at least 3 characters"],
      trim: true,
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
      required: [true, "Library staff is required"],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

const seatModel = mongoose.model("seats", seatSchema);

module.exports = seatModel;