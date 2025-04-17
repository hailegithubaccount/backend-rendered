const mongoose = require('mongoose');

const announcPromtSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  photo: {
    data: Buffer,
    contentType: String
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  targetRoles: [{
    type: String,
    enum: ['student', 'library-staff', 'all'],
    default: 'all'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate
announcPromtSchema.virtual('postedByDetails', {
  ref: 'users',
  localField: 'postedBy',
  foreignField: '_id',
  justOne: true,
  options: { select: 'firstName lastName email role photo' }
});

const Announcement = mongoose.model('announcPromt', announcPromtSchema);

module.exports = Announcement;