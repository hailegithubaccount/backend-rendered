const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    recipientStudentId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: [true, "Message text is required"],
    },
    sender: {
      type: String,
      enum: ["admin", "library-staff", "other"],
      default: "library-staff",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", messageSchema);
