const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // Reference to the User model
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "books", // Reference to the Book model
      required: false, // Not all notifications may be about books
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false, // Notifications are unread by default
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
