const mongoose = require('mongoose');

const bookLoanSchema = new mongoose.Schema({
  // Book Information (embedded, no separate Book model needed)
  bookTitle: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true
  },
  bookAuthor: {
    type: String,
    trim: true
  },
 
  
  // User References by Email
  studentEmail: {
    type: String,
    required: [true, 'Student email is required'],
    lowercase: true,
    validate: {
      validator: async function(email) {
        const user = await mongoose.model('users').findOne({ email });
        return user && user.role === 'student';
      },
      message: 'Must be a registered student email'
    }
  },
  
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },

  // Loan Details
  checkoutDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  returnDate: Date,
  status: {
    type: String,
    enum: ['active', 'returned', 'overdue'],
    default: 'active'
  },

  // Notification Tracking
  notifications: [{
    type: {
      type: String,
      enum: ['checkout', 'reminder', 'overdue', 'return'],
      required: true
    },
    message: String,
    date: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Auto-update status to overdue when due date passes
bookLoanSchema.pre('save', function(next) {
  if (this.dueDate < new Date() && this.status === 'active') {
    this.status = 'overdue';
    this.notifications.push({
      type: 'overdue',
      message: `Your book "${this.bookTitle}" is now overdue`
    });
  }
  next();
});

module.exports = mongoose.model('BookLoan', bookLoanSchema);