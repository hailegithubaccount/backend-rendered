const Message = require("../model/BookLoan"); // Or rename it to Message.js
const User = require("../model/userModel");

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
      sender
    };

    if (returnTime) {
      messageData.returnTime = new Date(returnTime);
      // Validate returnTime is in the future
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

    const now = new Date();

    const messages = await Message.find({
      recipientEmail: studentEmail,
      $or: [
        { returnTime: { $lte: now } },
        { returnTime: { $exists: false } },
      ]
    })
    .sort({ createdAt: -1 })
    .lean(); // Using lean() for better performance

    const unreadCount = await Message.countDocuments({
      recipientEmail: studentEmail,
      isRead: false,
      $or: [
        { returnTime: { $lte: now } },
        { returnTime: { $exists: false } },
      ]
    });

    res.json({ 
      success: true, 
      data: messages, 
      unreadCount 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};


exports.markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid message ID" 
      });
    }

    const updated = await Message.findByIdAndUpdate(
      messageId,
      { isRead: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        message: "Message not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Message marked as read", 
      data: updated 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to mark as read", 
      error: error.message 
    });
  }
};



