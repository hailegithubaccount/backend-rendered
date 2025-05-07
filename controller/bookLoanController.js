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
exports.getUnreadCount = async (req, res) => {
  try {
    const studentEmail = res.locals.email;

    if (!studentEmail) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: email not found."
      });
    }

    const unreadCount = await Message.countDocuments({
      recipientEmail: studentEmail,
      isRead: false
    });

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get unread count",
      error: error.message
    });
  }
};

// Mark a message as read


// Controller
exports.markAsRead = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const studentEmail = res.locals.email;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID format"
      });
    }

    const updatedMessage = await Message.findOneAndUpdate(
      {
        _id: messageId,
        recipientEmail: studentEmail,
        isRead: false // Only update if not already read
      },
      {
        $set: { isRead: true },
        $currentDate: { updatedAt: true }
      },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        message: "Message not found, already read, or doesn't belong to you"
      });
    }

    const unreadCount = await Message.countDocuments({
      recipientEmail: studentEmail,
      isRead: false
    });

    res.status(200).json({
      success: true,
      message: "Message marked as read",
      data: {
        messageId: updatedMessage._id,
        isRead: updatedMessage.isRead
      },
      unreadCount
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark message as read",
      error: error.message
    });
  }
};

// Get all messages sent by staff (with optional filtering)
exports.getStaffMessages = async (req, res) => {
  try {
    const { recipientEmail, recipientStudentId, startDate, endDate } = req.query;
    const query = { sender: "library-staff" };

    // Add optional filters
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