const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const SeatReservationNotification = require('../model/SeatReservationNotification');




const getSeatNotifications = asyncHandler(async (req, res) => {
    try {
      const studentId = res.locals.id;
      
      const notifications = await SeatReservationNotification.find({ 
        studentId: studentId 
      })
      .sort({ createdAt: -1 })
      .populate('seatId', 'seatNumber location'); // Add seat details
  
      res.status(200).json({
        status: "success",
        data: notifications
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to fetch seat notifications",
        error: error.message
      });
    }
  });


  module.exports = { 
    getSeatNotifications,  
  };
  