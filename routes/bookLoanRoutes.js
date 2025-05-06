const express = require('express');
const router = express.Router();
const bookLoanController = require('../controller/bookLoanController');
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 





// router.post(
//   '/',
//   protect,checkRole("library-staff"), checkUserExists,
//   bookLoanController.sendMessage
// );

// router.get(
//   '/student',
//  protect,checkRole("student"), checkUserExists,
//   bookLoanController.getMessagesForStudent 
// );


router.post("/create", protect,checkRole("library-staff"), checkUserExists, bookLoanController.createLoan);

// Get loans ready to notify (after 1 minute)
router.get("/ready", protect,checkRole("library-staff"), checkUserExists, bookLoanController.getReadyLoans);

// Send notification to student
router.post("/notify/:loanId",  protect,checkRole("student"), checkUserExists, bookLoanController.notifyStudent);

// router.patch("/mark-read/:messageId",  protect,checkRole("student"), checkUserExists,
// bookLoanController.markMessageAsRead);


// router.get('/unreadCount',protect,checkRole("student"), checkUserExists,bookLoanController.getUnreadCount);
// router.post('/markAsRead',protect,checkRole("student"), checkUserExists,bookLoanController.markAsRead );

// router.patch(
//   '/:loanId/return',
//  protect,checkRole("library-staff"), checkUserExists,
//   bookLoanController.returnBook
// );

module.exports = router;