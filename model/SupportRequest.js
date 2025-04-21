const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    message: {
      type: String,
      required: [true, 'Support message is required'],
      maxlength: 500
    },
    requestType: {
      type: String,
      enum: ['book-issue', 'facility-problem', 'equipment-failure', 'other'],
      default: 'other'
    },
    photo: {
      data: Buffer,
      contentType: String
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'rejected'],
      default: 'open'
    },
    staffResponse: {
      type: String,
      default: ''
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for photo URL
supportRequestSchema.virtual('photoUrl').get(function() {
  return this.photo?.data ? `/api/support/${this._id}/photo` : null;
});

module.exports = mongoose.model('SupportRequest', supportRequestSchema);