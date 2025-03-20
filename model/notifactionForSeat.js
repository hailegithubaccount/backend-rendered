const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // Reference to the User model (student)
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "books", // Reference to the Book model
      required: true,
    },
    seat: {
      type: String, // Store the seat number (e.g., "A1")
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false, // Mark notifications as unread by default
    },
    createdAt: {
      type: Date,
      default: Date.now, // Automatically set the creation timestamp
    },
  },
  { timestamps: true } // Adds `createdAt` and `updatedAt` fields
);

const Notification = mongoose.model("NotificationSeat", notificationSchema);

module.exports = Notification;