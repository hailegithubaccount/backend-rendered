const express = require("express");
const { sendNotification, updateNotificationStatus } = require("../controller/notificationController");

const { protect,checkRole, checkUserExists} = require('../middleware/auth');
const router = express.Router();

// ✅ Send Notification (Library Staff Only)
router.post("/", protect,checkRole("library-staff"), checkUserExists, sendNotification);

// ✅ Update Notification Status (Student Clicks "Yes" or "No")
router.patch("/:notificationId", protect,checkRole("student"), checkUserExists, updateNotificationStatus);

module.exports = router;
