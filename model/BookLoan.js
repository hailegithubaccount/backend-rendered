const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true
  },
  studentEmail: {
    type: String,
    required: true
  },
  bookTitle: {
    type: String,
    required: true
  },
  returnTime: {
    type: Date,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  sentToStudent: {
    type: Boolean,
    default: false
  },
  displayAfter: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model("Loan", loanSchema);
