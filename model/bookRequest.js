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
      enum: ["pending", "taken"], // Removed "approved" and "rejected"
      default: "pending",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    takenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // Reference to the library-staff who marked the book as taken
      default: null,
    },
    takenAt: {
      type: Date, // Timestamp for when the book was marked as taken
      default: null,
    },
  },
  { timestamps: true }
);

const BookRequest = mongoose.model("book_requests", bookRequestSchema);

module.exports = BookRequest;
