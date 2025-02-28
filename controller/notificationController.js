const asyncHandler = require("express-async-handler");
const Notification = require("../model/notificationModel");
const User = require("../model/userModel");

// ✅ Send Notification (Library Staff Only)
const sendNotification = asyncHandler(async (req, res) => {
  const { studentId, message } = req.body;
  const staffId = res.locals.id; // Authenticated user ID

  // ✅ Check if the sender is a library staff
  const staff = await User.findById(staffId);
  if (!staff || staff.role !== "library-staff") {
    return res.status(403).json({ status: "failed", message: "Only library staff can send notifications" });
  }

  // ✅ Check if the student exists
  const student = await User.findById(studentId);
  if (!student || student.role !== "student") {
    return res.status(404).json({ status: "failed", message: "Student not found" });
  }

  // ✅ Create the notification
  const notification = await Notification.create({ student: studentId, message });

  res.status(201).json({
    status: "success",
    message: "Notification sent successfully",
    data: notification,
  });
});

// ✅ Update Notification Status (Student Clicks "Yes" or "No")
const updateNotificationStatus = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const { status } = req.body; // status = "accepted" or "rejected"
  const studentId = res.locals.id; // Authenticated student

  // ✅ Validate status
  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ status: "failed", message: "Invalid status" });
  }

  // ✅ Find the notification
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    return res.status(404).json({ status: "failed", message: "Notification not found" });
  }

  // ✅ Ensure the student owns the notification
  if (notification.student.toString() !== studentId.toString()) {
    return res.status(403).json({ status: "failed", message: "You can only update your own notifications" });
  }

  // ✅ Update status
  notification.status = status;
  await notification.save();

  res.status(200).json({
    status: "success",
    message: `Notification marked as ${status}`,
    data: notification,
  });
});

module.exports = { sendNotification, updateNotificationStatus };
