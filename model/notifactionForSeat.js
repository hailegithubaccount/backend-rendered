const mongoose = require("mongoose");

const seatNotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "books",
      required: true,
    },
    student: {  // Add this new field
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true
    },
    seat: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['seat_assigned', 'return_reminder', 'return_overdue', 'return_confirmation'],
      required: true
    },
    deadline: {  // For tracking return deadlines
      type: Date,
      required: function() {
        return this.type === 'seat_assigned'; // Only required for assignment notifications
      }
    },
    isRead: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

const NotificationSeat = mongoose.model("NotificationSeat", seatNotificationSchema);
module.exports = NotificationSeat;