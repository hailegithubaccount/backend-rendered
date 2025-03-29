const Seat = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Notification = require('../model/messageN')

// @desc    Reserve a seat (Only students)
// @route   POST /api/seats/reserve/:id
// @access  Private (student)
const reserveSeat = asyncHandler(async (req, res) => {
  try {
    const seatId = req.params.id;
    const studentId = res.locals.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(seatId)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid seat ID format",
      });
    }

    // Find the seat
    const seat = await Seat.findById(seatId);
    if (!seat) {
      return res.status(404).json({ status: "failed", message: "Seat not found" });
    }

    // Check if the seat is already reserved
    if (!seat.isAvailable) {
      return res.status(400).json({
        status: "failed",
        message: "This seat is already reserved",
      });
    }

    // Ensure the seat type is "independent"
    if (seat.type !== "independent") {
      return res.status(400).json({
        status: "failed",
        message: "Only 'independent' type seats can be reserved",
      });
    }

    // Ensure the logged-in user is a student
    if (res.locals.role !== "student") {
      return res.status(403).json({
        status: "failed",
        message: "Only students can reserve a seat",
      });
    }

    // Check if the student has already reserved ANY seat (available or not)
    const existingReservation = await Seat.findOne({
      reservedBy: studentId,
      isAvailable: false
    });

    if (existingReservation) {
      return res.status(400).json({
        status: "failed",
        message: "You have already reserved a seat. Please release it before reserving another.",
        data: {
          reservedSeatId: existingReservation._id,
          seatNumber: existingReservation.seatNumber
        }
      });
    }

    // Reserve the seat (temporarily)
    seat.isAvailable = false;
    seat.reservedBy = studentId;
    seat.reservedAt = new Date();
    seat.isConfirmed = false; // Add this field to your Seat model

    await seat.save();

    // Create a notification for the student to confirm their presence
    const notification = await Notification.create({
      seatId: seat._id,
      studentId: studentId,
      message: "Are you in your reserved seat?",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes to respond
    });

    res.status(200).json({
      status: "success",
      message: "Seat reserved temporarily. Please confirm your presence within 15 minutes.",
      data: {
        id: seat._id,
        seatNumber: seat.seatNumber,
        type: seat.type,
        location: seat.location,
        isAvailable: seat.isAvailable,
        reservedBy: seat.reservedBy,
        reservedAt: seat.reservedAt,
        isConfirmed: seat.isConfirmed,
        notificationId: notification._id
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error: error.message,
    });
  }
});
// @desc    Release a seat (Only students)
// @route   POST /api/seats/release/:id
// @access  Private (student)
const handleNotificationResponse = asyncHandler(async (req, res) => {
  try {
    const { notificationId, response } = req.body;
    const studentId = res.locals.id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ status: "failed", message: "Invalid notification ID" });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ status: "failed", message: "Notification not found" });
    }

    // Check if the responding student is the intended recipient
    if (notification.studentId.toString() !== studentId.toString()) {
      return res.status(403).json({ 
        status: "failed", 
        message: "Not authorized to respond to this notification" 
      });
    }

    // Check if notification has expired
    if (new Date() > notification.expiresAt) {
      notification.status = 'rejected';
      await notification.save();
      
      // Release the seat
      await Seat.findByIdAndUpdate(notification.seatId, {
        isAvailable: true,
        reservedBy: null,
        releasedAt: new Date(),
        isConfirmed: false
      });

      return res.status(400).json({ 
        status: "failed", 
        message: "Response time expired. Seat has been released." 
      });
    }

    // Update notification status based on response
    if (response === 'yes') {
      notification.status = 'confirmed';
      await notification.save();
      
      // Confirm the seat reservation
      await Seat.findByIdAndUpdate(notification.seatId, {
        isConfirmed: true
      });

      return res.status(200).json({ 
        status: "success", 
        message: "Seat reservation confirmed. Enjoy your seat!" 
      });
    } else if (response === 'no') {
      notification.status = 'rejected';
      await notification.save();
      
      // Release the seat
      await Seat.findByIdAndUpdate(notification.seatId, {
        isAvailable: true,
        reservedBy: null,
        releasedAt: new Date(),
        isConfirmed: false
      });

      return res.status(200).json({ 
        status: "success", 
        message: "Seat has been released for others." 
      });
    } else {
      return res.status(400).json({ 
        status: "failed", 
        message: "Invalid response. Please respond with 'yes' or 'no'." 
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error: error.message
    });
  }
});


const checkExpiredNotifications = async () => {
  try {
    const now = new Date();
    const expiredNotifications = await Notification.find({
      status: 'pending',
      expiresAt: { $lt: now }
    });

    for (const notification of expiredNotifications) {
      notification.status = 'rejected';
      await notification.save();
      
      await Seat.findByIdAndUpdate(notification.seatId, {
        isAvailable: true,
        reservedBy: null,
        releasedAt: new Date(),
        isConfirmed: false
      });
    }
  } catch (error) {
    console.error("Error processing expired notifications:", error);
  }
};

// Run this every minute
setInterval(checkExpiredNotifications, 60 * 1000);

const getIndependentSeats = asyncHandler(async (req, res) => {
  try {
    const { populate = 'false' } = req.query;
    
    let query = Seat.find({ type: "independent" });
    
    if (populate === 'true') {
      query = query.populate({
        path: 'reservedBy',
        select: 'name email' // Only include these fields
      });
    }

    const independentSeats = await query.exec();
    
    // Categorize seats
    const availableSeats = independentSeats.filter(seat => seat.isAvailable);
    const occupiedSeats = independentSeats.filter(seat => !seat.isAvailable);

    res.status(200).json({
      status: "success",
      results: independentSeats.length,
      data: {
        availableSeats,
        occupiedSeats,
        populated: populate === 'true' // Indicate if results are populated
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error: error.message
    });
  }
});








const releaseSeat = asyncHandler(async (req, res) => {
  try {
    const seatId = req.params.id;
    const userId = res.locals.id;

    if (!mongoose.Types.ObjectId.isValid(seatId)) {
      return res.status(400).json({ status: "failed", message: "Invalid seat ID" });
    }

    const seat = await Seat.findById(seatId);
    if (!seat) {
      return res.status(404).json({ status: "failed", message: "Seat not found" });
    }

    if (seat.isAvailable) {
      return res.status(400).json({ 
        status: "failed", 
        message: "Seat is already available" 
      });
    }

    // Convert both IDs to string for comparison
    if (seat.reservedBy?.toString() !== userId.toString()) {
      return res.status(403).json({ 
        status: "failed", 
        message: "Not authorized to release this seat" 
      });
    }

    // Release the seat
    seat.isAvailable = true;
    seat.reservedBy = null;
    seat.releasedAt = new Date();

    await seat.save();

    res.status(200).json({
      status: "success",
      message: "Seat released successfully",
      data: {
        id: seat._id,
        seatNumber: seat.seatNumber,
        isAvailable: seat.isAvailable,
        releasedAt: seat.releasedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error: error.message
    });
  }
});


const getReservedIndependentSeats = asyncHandler(async (req, res) => {
  try {
    // Ensure only library staff can access this route
    if (res.locals.user.role !== "library-staff") {
      return res.status(403).json({
        status: "failed",
        message: "Access denied. Only library staff can fetch reserved seats.",
      });
    }

    // Find all reserved independent seats (isAvailable = false and type = "independent")
    const reservedSeats = await Seat.find({ 
      isAvailable: false,
      type: "independent" 
    }).populate(
      "reservedBy",
      "name email studentId"
    );

    if (reservedSeats.length === 0) {
      return res.status(404).json({
        status: "success",
        message: "No reserved independent seats found",
        data: []
      });
    }

    res.status(200).json({
      status: "success",
      message: "Reserved independent seats fetched successfully",
      data: reservedSeats,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error: error.message,
    });
  }
});

const releaseSeatByStaff = asyncHandler(async (req, res) => {
  try {
    if (res.locals.role !== "library-staff") {
      return res.status(403).json({
        status: "failed",
        message: "Only library staff can release seats",
      });
    }

    const { seatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(seatId)) {
      return res.status(400).json({ status: "failed", message: "Invalid seat ID" });
    }

    const seat = await Seat.findById(seatId);

    if (!seat) {
      return res.status(404).json({ status: "failed", message: "Seat not found" });
    }

    if (seat.isAvailable) {
      return res.status(400).json({
        status: "failed",
        message: "Seat is already available",
      });
    }

    // Release the seat
    seat.isAvailable = true;
    seat.reservedBy = null;
    seat.releasedAt = new Date();

    await seat.save();

    res.status(200).json({
      status: "success",
      message: "Seat released by staff successfully",
      data: {
        seatNumber: seat.seatNumber,
        isAvailable: seat.isAvailable,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error: error.message,
    });
  }
});

















// @desc    Get only 'independent' type seats
// @route   GET /api/seats/independent
// @access  Public
// const getIndependentSeats = asyncHandler(async (req, res) => {
//   try {
//     // Fetch only seats of type "independent"
//     const independentSeats = await Seat.find({ type: "independent" })
//       .populate("reservedBy", "name email") // Populate reservedBy with user details (optional)
//       .populate("managedBy", "name email"); // Populate managedBy with staff details (optional)

//     // Categorize seats into available and occupied
//     const availableSeats = independentSeats.filter((seat) => seat.isAvailable);
//     const occupiedSeats = independentSeats.filter((seat) => !seat.isAvailable);

//     res.status(200).json({
//       status: "success",
//       results: independentSeats.length,
//       data: {
//         availableSeats,
//         occupiedSeats,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: "error",
//       message: "Something went wrong",
//       error: error.message,
//     });
//   }
// });










  module.exports = {
    reserveSeat,
    getIndependentSeats ,
    releaseSeat,
    getReservedIndependentSeats ,
    releaseSeatByStaff,
    handleNotificationResponse,
    
    
  };