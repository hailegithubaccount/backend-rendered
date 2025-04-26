const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users', // Your users model
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Chapter', chapterSchema);
