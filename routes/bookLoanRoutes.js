// routes/bookLoanRoutes.js
const express = require("express");
const bookLoanController = require("../controller/bookLoanController");

const router = express.Router();

// Staff creates a new loan
router.post("/", bookLoanController.createLoan);

// Student gets their notifications
router.get("/notifications/:studentId", bookLoanController.getStudentNotifications);

module.exports = router;