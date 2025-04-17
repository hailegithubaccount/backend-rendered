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
        select: "title name", // Fetch only title & author of the book
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

const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params; // Notification ID from the URL
  const userId = res.locals.id; // Authenticated user's ID

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ status: "failed", message: "Invalid notification ID format" });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ status: "failed", message: "Invalid user ID format" });
  }
  try {
    // Find the notification by ID and ensure it belongs to the authenticated user
    const notification = await Notification.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({ status: "failed", message: "Notification not found or unauthorized" });
    }

    res.status(200).json({
      status: "success",
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      status: "failed",
      message: "Server error, unable to delete notification",
    });
  }
});

// Get overdue notifications for staff















module.exports = { 
  getNotifications,
  deleteNotification, 
 


};