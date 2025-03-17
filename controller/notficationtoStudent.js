const asyncHandler = require("express-async-handler");
const Notification = require("../model/Notification");

// @desc    Get notifications for the authenticated user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  // req.user is set by the authentication middleware (e.g., JWT)
  const userId = res.locals.id;

  // Fetch notifications for the authenticated user
  const notifications = await Notification.find({ user: userId })
    .sort({ createdAt: -1 }) // Sort by latest first
    .exec();

  res.status(200).json({
    status: "success",
    notifications,
  });
});

module.exports = { getNotifications };