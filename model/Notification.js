const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "books",
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    notificationType: {  // Specific to wishlist notifications
      type: String,
      enum: ['wishlist_available', 'general'],
      default: 'general'
    }
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;