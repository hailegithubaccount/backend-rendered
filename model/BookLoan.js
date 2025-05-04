const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Changed from "users" to match typical Mongoose convention
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    recipientStudentId: {
      type: String,
      required: true,
      trim: true
    },
    text: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      minlength: 1
    },
    sender: {
      type: String,
      enum: ["admin", "library-staff", "other"],
      default: "library-staff",
    },
    returnTime: {
      type: Date,
      validate: {
        validator: function(value) {
          // Only validate if returnTime exists
          if (!value) return true;
          return value > new Date();
        },
        message: 'Return time must be in the future'
      }
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);