const Seat = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const SeatReservationNotification = require('../model/SeatReservationNotification');
const agenda = require('../utils/Agenda');




 // Assume agenda is initialized here

const reserveSeat = asyncHandler(async (req, res) => {
  const { seatId } = req.body;
  const studentId = res.locals.id;

  const seat = await Seat.findById(seatId);
  if (!seat || !seat.isAvailable) {
    return res.status(400).json({ message: "Seat not available" });
  }

  seat.isAvailable = false;
  seat.reservedBy = studentId;
  seat.reservedAt = new Date();
  await seat.save();

  await agenda.schedule(new Date(Date.now() + 60 * 1000), 'send reservation notification', {
    seatId: seat._id,
    studentId
  });

  return res.status(200).json({ message: "Seat reserved and notification scheduled." });
});




const handleSeatResponse = asyncHandler(async (req, res) => {
  const { notificationId, response } = req.body;
  const studentId = res.locals.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const notification = await SeatReservationNotification.findById(notificationId).session(session);
    if (!notification || notification.studentId.toString() !== studentId) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Notification not found or unauthorized" });
    }

    const seat = await Seat.findById(notification.seatId).session(session);
    if (!seat) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Seat not found" });
    }

    if (notification.actionResponse !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ message: "Notification already acted upon" });
    }

    notification.requiresAction = false;
    notification.actionResponse = response;
    await notification.save({ session });

    await agenda.cancel({ 'data.notificationId': notification._id });

    if (response === 'extend') {
      const nextReminder = new Date(Date.now() + 2 * 60 * 1000);

      await SeatReservationNotification.create([{
        studentId,
        seatId: seat._id,
        message: `Seat ${seat.seatNumber} reservation extended.`,
        isRead: false,
        requiresAction: false
      }], { session });

      await agenda.schedule(nextReminder, 'send reservation notification', {
        seatId: seat._id,
        studentId
      });

      await session.commitTransaction();
      return res.status(200).json({ message: "Seat reservation extended" });
    } else {
      seat.isAvailable = true;
      seat.reservedBy = null;
      seat.reservedAt = null;
      seat.releasedAt = new Date();
      await seat.save({ session });

      await SeatReservationNotification.create([{
        studentId,
        seatId: seat._id,
        message: `Seat ${seat.seatNumber} has been released.`,
        isRead: false,
        requiresAction: false
      }], { session });

      await session.commitTransaction();
      return res.status(200).json({ message: "Seat released" });
    }

  } catch (err) {
    await session.abortTransaction();
    console.error("Error in handleSeatResponse:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    session.endSession();
  }
});


// Utility function to schedule automatic release






// Utility function to schedule automatic release using cron






// Start agenda when DB is connected





/**
 * Handle seat extension/release response
 */


/**
 * Fetch pending notifications for a student
 */
const fetchPendingNotifications = asyncHandler(async (req, res) => {
  const studentId = res.locals.id;

  try {
    const notifications = await SeatReservationNotification.find({
      studentId: studentId,
      requiresAction: true
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      status: "success",
      data: notifications.map(notification => ({
        id: notification._id,
        message: notification.message,
        deadline: notification.deadline,
        seatId: notification.seatId,
        createdAt: notification.createdAt
      }))
    });
  } catch (error) {
    console.error("Error fetching pending notifications:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch pending notifications",
      error: error.message
    });
  }
});



// @desc    Release a seat (Only students)
// @route   POST /api/seats/release/:id
// @access  Private (student)
/**
 * Fetch all seat-related notifications for a student (pending and automatic releases)
 * @route GET /api/seats/notifications
 * @access Private (student)
 */
const fetchSeatNotifications = asyncHandler(async (req, res) => {
  const studentId = res.locals.id;

  try {
    // Fetch all seat notifications for this student, sorted by newest first
    const notifications = await SeatReservationNotification.find({
      studentId: studentId
    })
    .sort({ createdAt: -1 })
    .limit(50); // Limit to 50 most recent notifications

    // Categorize notifications
    const result = {
      pendingActions: notifications.filter(n => n.requiresAction),
      recentReleases: notifications.filter(n => 
        !n.requiresAction && 
        n.actionResponse === 'autoRelease'
      ),
      otherNotifications: notifications.filter(n => 
        !n.requiresAction && 
        n.actionResponse !== 'autoRelease'
      )
    };

    return res.status(200).json({
      status: "success",
      data: {
        ...result,
        // Also include counts for easy UI display
        counts: {
          pending: result.pendingActions.length,
          autoReleases: result.recentReleases.length,
          others: result.otherNotifications.length
        }
      }
    });
  } catch (error) {
    console.error("Error fetching seat notifications:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch seat notifications",
      error: error.message
    });
  }
});

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


const getAllReservedSeats = asyncHandler(async (req, res) => {
  try {
    // Ensure only library staff can access this route
    if (res.locals.role !== "library-staff") {
      return res.status(403).json({
        status: "failed",
        message: "Access denied. Only library staff can fetch reserved seats.",
      });
    }

    // Find all reserved seats (isAvailable = false) and populate reservedBy details
    const reservedSeats = await Seat.find({ isAvailable: false }).populate(
      "reservedBy",
      "name email studentId"
    );

    if (reservedSeats.length === 0) {
      return res.status(404).json({
        status: "failed",
        message: "No reserved seats found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Reserved seats fetched successfully",
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

const countReservedSeats = asyncHandler(async (req, res) => {
  // only library-staff
  if (res.locals.role !== "library-staff") {
    return res.status(403).json({
      status: "failed",
      message: "Access denied. Only library staff can view reserved seat count.",
    });
  }

  const count = await Seat.countDocuments({ isAvailable: false });
  res.status(200).json({
    status: "success",
    count,
  });
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
    getAllReservedSeats,
    releaseSeatByStaff,
    handleSeatResponse,
    fetchPendingNotifications,
    countReservedSeats,
    fetchSeatNotifications,
    

    
  };