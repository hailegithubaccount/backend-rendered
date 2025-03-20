const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const NotificationSeat = require("../model/notifactionForSeat");


const getNotifications = asyncHandler(async (req, res) => {
    const studentId = res.locals.id; // Get the logged-in student's ID
  
    // Fetch all notifications for the student
    const notifications = await NotificationSeat.find({ user: studentId })
      .sort({ createdAt: -1 }) // Sort by newest first
      .populate("book", "name"); // Populate the book name for better readability
  
    res.status(200).json({
      status: "success",
      results: notifications.length,
      data: notifications,
    });
  });