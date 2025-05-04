const Message = require("../model/BookLoan"); // Or rename it to Message.js
const User = require("../model/userModel");

// Send a message to a student
exports.sendMessage = async (req, res) => {
  try {
    const { email, studentId, text, sender, returnTime } = req.body;

    const user = await User.findOne({ email, studentId });
    if (!user || user.role !== "student") {
      return res.status(404).json({ message: "Student not found" });
    }

    const message = await Message.create({
      recipient: user._id,
      recipientEmail: email,
      recipientStudentId: studentId,
      text,
      sender: sender || "library-staff",
      returnTime: returnTime ? new Date(returnTime) : undefined, // parse to Date
    });

    res.status(201).json({ message: "Message sent successfully", data: message });
  } catch (error) {
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};


// Get all messages for a specific student
exports.getMessagesForStudent = async (req, res) => {
  const studentEmail = res.locals.email;

  if (!studentEmail) {
    return res.status(401).json({ success: false, message: "Unauthorized: email not found." });
  }

  try {
    const now = new Date();

    // Fetch all visible messages (returnTime passed or not set)
    const messages = await Message.find({
      recipientEmail: studentEmail,
      $or: [
        { returnTime: { $lte: now } },
        { returnTime: { $exists: false } },
      ]
    }).sort({ createdAt: -1 }); // Newest first

    // Count unread messages
    const unreadCount = messages.filter(msg => !msg.isRead).length;

    res.json({ success: true, messages, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


exports.markMessageAsRead = async (req, res) => {
  const { messageId } = req.params;

  try {
    const updated = await Message.findByIdAndUpdate(
      messageId,
      { isRead: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    res.json({ success: true, message: "Message marked as read", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to mark as read", error: error.message });
  }
};



