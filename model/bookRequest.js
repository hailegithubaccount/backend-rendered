const mongoose = require("mongoose");

const bookRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // Reference to the user model (student)
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "books", // Reference to the book model
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // Reference to the library-staff
      default: null,
    },
  },
  { timestamps: true }
);

const BookRequest = mongoose.model("book_requests", bookRequestSchema);

module.exports = BookRequest;
