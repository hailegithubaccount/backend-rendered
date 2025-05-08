const Message = require("../model/BookLoan");
const User = require("../model/userModel");
const mongoose = require("mongoose");

// Send a message to a student
exports.sendMessage = async (req, res) => {
  try {
    const { email, studentId, title, description, sender = "library-staff" } = req.body;

    // Validate input
    if (!email || !studentId || !title || !description) {
      return res.status(400).json({ message: "Email, studentId, title, and description are required" });
    }

    const user = await User.findOne({ email, studentId });
    if (!user || user.role !== "student") {
      return res.status(404).json({ message: "Student not found" });
    }

    const messageData = {
      recipient: user._id,
      recipientEmail: email,
      recipientStudentId: studentId,
      title,
      description,
      sender,
    };

    const message = await Message.create(messageData);

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message
    });
  }
};

// Get all messages for a specific student
exports.getMessagesForStudent = async (req, res) => {
  try {
    const studentEmail = res.locals.email;

    if (!studentEmail) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: email not found."
      });
    }

    const messages = await Message.find({
      recipientEmail: studentEmail
    }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get unread message count for student


// @desc    Get unread messages count
// @route   GET /api/messages/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const studentEmail = res.locals.email;

    if (!studentEmail) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: email not found'
      });
    }

    const unreadCount = await Message.countDocuments({
      recipientEmail: studentEmail,
      isRead: false
    });

    res.status(200).json({
      status: 'success',
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// @desc    Mark message as read
// @route   POST /api/messages/:id/mark-as-read
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    const studentEmail = res.locals.email;

    // Update all unread messages for the student
    const result = await Message.updateMany(
      {
        recipientEmail: studentEmail,
        isRead: false
      },
      {
        $set: { isRead: true },
        $currentDate: { updatedAt: true }
      }
    );

    // After updating, get the new unread count
    const unreadCount = await Message.countDocuments({
      recipientEmail: studentEmail,
      isRead: false
    });

    res.status(200).json({
      status: 'success',
      message: `${result.modifiedCount} message(s) marked as read.`,
      unreadCount
    });

  } catch (error) {
    console.error('Error marking all messages as read:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};



exports.getStaffMessages = async (req, res) => {
  try {
    const { recipientEmail, recipientStudentId, startDate, endDate } = req.query;
    const query = { sender: "library-staff" };

    if (recipientEmail) {
      query.recipientEmail = recipientEmail;
    }
    if (recipientStudentId) {
      query.recipientStudentId = recipientStudentId;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .populate('recipient', 'name email studentId')
      .lean();

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve staff messages",
      error: error.message
    });
  }
};

// Delete a message by staff (only messages sent by staff can be deleted)
exports.deleteByStaff = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID format"
      });
    }

    const message = await Message.findOneAndDelete({
      _id: messageId,
      sender: "library-staff"
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found or not authorized to delete"
      });
    }

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: error.message
    });
  }
};