const Message = require("../model/BookLoan");
const User = require("../model/userModel");

// Send a message to a student
exports.sendMessage = async (req, res) => {
  try {
    const { email, studentId, text, sender } = req.body;

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
    });

    res.status(201).json({ message: "Message sent successfully", data: message });
  } catch (error) {
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

// Get all messages for a specific student
exports.getMessagesByStudentEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const messages = await Message.find({ recipientEmail: email }).sort({ createdAt: -1 });

    res.status(200).json({ count: messages.length, messages });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
};
