const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const NotificationSeat = require("../model/notifactionForSeat");
const User = require("../model/userModel"); // Make sure you have this model

// Save Expo Push Token
// const savePushToken = asyncHandler(async (req, res) => {
//   const { expoPushToken } = req.body;
//   const userId = res.locals.id; // From authenticated user

//   if (!expoPushToken) {
//     return res.status(400).json({ status: "failed", message: "Expo push token is required" });
//   }

//   try {
//     const updatedUser = await User.findByIdAndUpdate(
//       userId,
//       { expoPushToken },
//       { new: true }
//     );

//     if (!updatedUser) {
//       return res.status(404).json({ status: "failed", message: "User not found" });
//     }

//     res.status(200).json({
//       status: "success",
//       message: "Push token saved successfully",
//     });
//   } catch (error) {
//     console.error("Error saving push token:", error);
//     res.status(500).json({ status: "error", message: "Internal server error" });
//   }
// });

// Get Notifications (existing)
const getNotifications = asyncHandler(async (req, res) => {
  const studentId = res.locals.id;
  
  const notifications = await NotificationSeat.find({ user: studentId })
    .sort({ createdAt: -1 })
    .populate("book", "name");
  
  res.status(200).json({
    status: "success",
    results: notifications.length,
    data: notifications,
  });
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
    const notification = await NotificationSeat.findOneAndDelete({
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




module.exports = { 
  getNotifications,
  deleteNotification,
};

