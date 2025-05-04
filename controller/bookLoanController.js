const Message = require("../model/BookLoan"); // Or rename it to Message.js
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
exports.getMessagesForStudent = async (req, res) => {
  const studentEmail = res.locals.email; // coming from token
  try {
    const messages = await Message.find({ recipientEmail: studentEmail });
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
