const mongoose = require('mongoose');

const announcpromtsSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  photo: {
    data: Buffer,
    contentType: String
  }
}, { timestamps: true });

const announcpromts = mongoose.model('announcpromts', announcpromtsSchema);

module.exports = announcpromts;