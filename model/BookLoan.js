const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  recipientEmail: {
    type: String,
    required: true
  },
  recipientStudentId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    enum: ['admin', 'library-staff', 'other'],
    default: 'library-staff'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);