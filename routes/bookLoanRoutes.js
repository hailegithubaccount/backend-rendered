const express = require('express');
const router = express.Router();
const bookLoanController = require('../controller/bookLoanController');
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 





router.post(
  '/',
  protect,checkRole("library-staff"), checkUserExists,
  bookLoanController.createLoan
);

router.get(
  '/my-loans',
 protect,checkRole("student"), checkUserExists,
  bookLoanController.getMyLoans
);

router.patch(
  '/:loanId/return',
 protect,checkRole("library-staff"), checkUserExists,
  bookLoanController.returnBook
);

module.exports = router;