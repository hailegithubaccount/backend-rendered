const Message = require("../model/BookLoan"); // Or rename it to Message.js
const User = require("../model/userModel");
const mongoose = require("mongoose");

// Send a message to a student
exports.sendMessage = async (req, res) => {
  try {
    const { email, studentId, text, sender = "library-staff", returnTime } = req.body;

    // Validate input
    if (!email || !studentId || !text) {
      return res.status(400).json({ message: "Email, studentId, and text are required" });
    }

    const user = await User.findOne({ email, studentId });
    if (!user || user.role !== "student") {
      return res.status(404).json({ message: "Student not found" });
    }

    const messageData = {
      recipient: user._id,
      recipientEmail: email,
      recipientStudentId: studentId,
      text,
      sender,
      // Removed displayAfter (message will be shown immediately)
    };

    if (returnTime) {
      messageData.returnTime = new Date(returnTime);
      if (messageData.returnTime <= new Date()) {
        return res.status(400).json({ message: "Return time must be in the future" });
      }
    }

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
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const studentEmail = res.locals.email;

    if (!studentEmail) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: email not found."
      });
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID format"
      });
    }

    const updatedMessage = await Message.findOneAndUpdate(
      {
        _id: messageId,
        recipientEmail: studentEmail
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
        message: "Message not found or doesn't belong to you"
      });
    }

    const unreadCount = await Message.countDocuments({
      recipientEmail: studentEmail,
      isRead: false
    });

    res.status(200).json({
      success: true,
      message: "Message marked as read",
      data: updatedMessage,
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
