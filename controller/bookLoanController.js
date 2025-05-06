const Loan = require("../model/Loan");
const Message = require("../model/Message");
const User = require("../model/userModel");

exports.createLoan = async (req, res) => {
  try {
    const { studentId, studentEmail, bookTitle, returnTime } = req.body;

    if (!studentId || !studentEmail || !bookTitle || !returnTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const loan = await Loan.create({
      studentId,
      studentEmail,
      bookTitle,
      returnTime: new Date(returnTime),
      createdBy: res.locals.id,
      displayAfter: new Date(Date.now() + 60 * 1000) // show in dashboard after 1 minute
    });

    res.status(201).json({
      success: true,
      message: "Loan created. Will show in dashboard after 1 minute.",
      data: loan
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Staff dashboard: get loans ready to notify student
exports.getReadyLoans = async (req, res) => {
  try {
    const now = new Date();
    const loans = await Loan.find({
      createdBy: res.locals.id,
      sentToStudent: false,
      displayAfter: { $lte: now }
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Staff clicks button to notify student
exports.notifyStudent = async (req, res) => {
  try {
    const { loanId } = req.params;

    const loan = await Loan.findById(loanId);
    if (!loan || loan.sentToStudent) {
      return res.status(404).json({ message: "Loan not found or already sent" });
    }

    // Send message
    const message = await Message.create({
      recipientEmail: loan.studentEmail,
      recipientStudentId: loan.studentId,
      text: `Reminder: Please return the book "${loan.bookTitle}" by ${loan.returnTime.toDateString()}.`,
      sender: "library-staff",
      recipient: null,
      displayAfter: new Date() // show immediately
    });

    // Mark loan as notified
    loan.sentToStudent = true;
    await loan.save();

    res.status(200).json({ 
      success: true,
      message: "Notification sent to student",
      data: message 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
