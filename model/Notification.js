const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // Reference to the User model
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false, // Notifications are unread by default
    },
    link: {
      type: String,
      default: "", // Optional link to redirect the user (e.g., book details page)
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;