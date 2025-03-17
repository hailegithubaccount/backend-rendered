const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Notification = require("../model/Notification");

// @desc    Get notifications for the authenticated user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const userId = res.locals.id; // Authenticated user ID from middleware
  const { page = 1, limit = 10, unreadOnly = false } = req.query; // Pagination and filters

  // Validate that the userId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ status: "failed", message: "Invalid user ID format" });
  }

  // Convert userId to ObjectId
  const objectIdUserId = new mongoose.Types.ObjectId(userId);

  // Build the query
  const query = { user: objectIdUserId };
  if (unreadOnly === "true") {
    query.read = false; // Filter unread notifications only
  }

  // Fetch notifications for the authenticated user
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 }) // Sort by latest first
    .skip((page - 1) * limit) // Pagination: skip
    .limit(limit) // Pagination: limit
    .populate("book", "name author photo") // Populate book details
    .exec();

  // Get the total count of notifications (for pagination)
  const totalNotifications = await Notification.countDocuments(query);

  res.status(200).json({
    status: "success",
    notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalNotifications,
      totalPages: Math.ceil(totalNotifications / limit),
    },
  });
});

module.exports = { getNotifications };