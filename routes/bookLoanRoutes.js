const express = require('express');
const router = express.Router();
const bookLoanController = require('../controller/bookLoanController');
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 





router.post(
  '/',
  protect,checkRole("library-staff"), checkUserExists,
  bookLoanController.sendMessage
);

router.get(
  '/student',
 protect,checkRole("student"), checkUserExists,
  bookLoanController.getMessagesForStudent 
);

// router.patch("/mark-read/:messageId",  protect,checkRole("student"), checkUserExists,
// bookLoanController.markMessageAsRead);''




router.get('/staff',protect,checkRole("library-staff"), checkUserExists,
bookLoanController.getStaffMessages);

router.delete('/staff/:messageId', protect,checkRole("library-staff"), checkUserExists,
bookLoanController.deleteByStaff);

router.get('/unreadCount',protect,checkRole("student"), checkUserExists,bookLoanController.getUnreadCount);
router.post('/markAsRead',protect,checkRole("student"), checkUserExists,bookLoanController.markAsRead );



module.exports = router;