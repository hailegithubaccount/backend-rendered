// controllers/bookLoanController.js
const BookLoan = require("../models/BookLoan");

// Staff checks out a book
exports.createLoan = async (req, res) => {
  try {
    const { studentId, bookTitle, dueDate } = req.body;

    const loan = await BookLoan.create({
      studentId,
      bookTitle,
      dueDate: new Date(dueDate),
      notifications: [{
        message: `You have borrowed "${bookTitle}". Due date: ${new Date(dueDate).toDateString()}`
      }]
    });

    res.status(201).json({
      status: "success",
      data: loan,
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Get notifications for a student
exports.getStudentNotifications = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const loans = await BookLoan.find({
      studentId,
      returned: false,
    }).select("notifications bookTitle");

    // Combine all notifications
    const allNotifications = [];
    loans.forEach(loan => {
      loan.notifications.forEach(notif => {
        allNotifications.push({
          bookTitle: loan.bookTitle,
          message: notif.message,
          date: notif.date,
          read: notif.read,
        });
      });
    });

    res.status(200).json({
      status: "success",
      data: allNotifications,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

// Check for due loans and add notifications
exports.checkDueLoans = async () => {
  try {
    const now = new Date();
    const dueSoon = new Date(now);
    dueSoon.setDate(now.getDate() + 1); // 1 day before due date

    const loans = await BookLoan.find({
      dueDate: { $lte: dueSoon },
      returned: false,
      "notifications.message": { 
        $not: /due tomorrow/i 
      }
    });

    for (const loan of loans) {
      loan.notifications.push({
        message: `REMINDER: "${loan.bookTitle}" is due tomorrow!`
      });
      await loan.save();
    }

    console.log(`Added ${loans.length} due notifications`);
  } catch (err) {
    console.error("Error checking due loans:", err);
  }
};