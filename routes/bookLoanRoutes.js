const express = require('express');
const router = express.Router();
const bookLoanController = require('../controller/bookLoanController');
const { protect, checkRole, checkUserExists } = require('../middleware/auth');

// Staff sends a message to a student
router.post(
  '/',
  protect,
  checkRole("library-staff"),
  checkUserExists,
  bookLoanController.sendMessage
);

// Student fetches messages sent to them
router.get(
  '/student',
  protect,
  checkRole("student"),
  checkUserExists,
  bookLoanController.getMessagesForStudent
);

// Uncomment when book return feature is ready
// router.patch(
//   '/:loanId/return',
//   protect,
//   checkRole("library-staff"),
//   checkUserExists,
//   bookLoanController.returnBook
// );

module.exports = router;
