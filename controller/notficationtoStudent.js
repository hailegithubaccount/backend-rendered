const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Notification = require("../model/Notification");

// @desc    Get notifications for the authenticated user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const userId = res.locals.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ status: "failed", message: "Invalid user ID format" });
  }

  try {
    // Fetch notifications and populate book details while excluding 'link'
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 }) // Sort by latest notifications first
      .populate({
        path: "book", // Assuming there is a 'book' reference in notifications
        select: "title author", // Fetch only title & author of the book
      })
      .select("-link"); // Exclude 'link' from the response

    res.status(200).json({
      status: "success",
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      status: "failed",
      message: "Server error, unable to fetch notifications",
    });
  }
});


module.exports = { getNotifications };