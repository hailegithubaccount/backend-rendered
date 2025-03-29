const mongoose = require("mongoose");

const messageSchema= new mongoose.Schema({
  seatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seat', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: "pending" },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true } // Time by which student must respond
});



module.exports = mongoose.model("Message", messageSchema);
