const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Notification = require("../model/Notification");

// @desc    Get notifications for the authenticated user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  // req.user is set by the authentication middleware (e.g., JWT)
  const userId = res.locals.id;

  // Validate that the userId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ status: "failed", message: "Invalid user ID format" });
  }

  // Convert userId to ObjectId
  const objectIdUserId = new mongoose.Types.ObjectId(userId);

  // Fetch notifications for the authenticated user
  const notifications = await Notification.find({ user: objectIdUserId })
    .sort({ createdAt: -1 }) // Sort by latest first
    .exec();

  res.status(200).json({
    status: "success",
    notifications,
  });
});

module.exports = { getNotifications };