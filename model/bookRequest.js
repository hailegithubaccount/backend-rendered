const mongoose = require("mongoose");

const bookRequestSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "books", required: true },
    status: { 
      type: String, 
      enum: ['pending', 'taken', 'returned', 'overdue'], 
      default: 'pending' 
    },
    requestedAt: { type: Date, default: Date.now },
    takenBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
    takenAt: { type: Date, default: null },
    returnedAt: { type: Date, default: null },
    seat: { type: String, default: null }, 
    returnDeadline: Date, // New field for deadline
    overdueNotified: { type: Boolean, default: false } 
  },
  { timestamps: true }
);

const BookRequest = mongoose.model("book_requests", bookRequestSchema);

module.exports = BookRequest;
