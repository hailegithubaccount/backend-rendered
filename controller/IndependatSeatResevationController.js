const Seat = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const SeatReservationNotification = require('../model/SeatReservationNotification');

// @desc    Reserve a seat (Only students)
// @route   POST /api/seats/reserve/:id
// @access  Private (student)



// Utility function to schedule automatic release
const scheduleReleaseCheck = (seatId, deadline) => {
  const now = new Date();
  const timeUntilDeadline = deadline - now;

  setTimeout(async () => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const seat = await Seat.findById(seatId).session(session);
      if (!seat || seat.isAvailable) {
        await session.commitTransaction();
        return;
      }

      const notification = await SeatReservationNotification.findOne({
        seatId: seatId,
        requiresAction: true
      }).session(session);

      if (notification) {
        // Automatic release process
        seat.isAvailable = true;
        seat.reservedBy = null;
        seat.reservedAt = null;
        seat.releasedAt = new Date();
        await seat.save({ session });

        // Update notification
        notification.actionResponse = 'release';
        notification.message = `Seat ${seat.seatNumber} was automatically released after deadline.`;
        notification.requiresAction = false;
        await notification.save({ session });

        // Create release notification (this is a separate informational notification)
        await SeatReservationNotification.create([{
          studentId: seat.reservedBy,
          seatId: seat._id,
          message: `Your seat ${seat.seatNumber} has been automatically released.`,
          isRead: false,
          requiresAction: false,
          deadline: new Date()
        }], { session });
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error('Automatic release error:', error);
    } finally {
      session.endSession();
    }
  }, Math.max(0, timeUntilDeadline));
};

/**
 * Reserve a seat
 */
const reserveSeat = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const seatId = req.params.id;
    const studentId = res.locals.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(seatId)) {
      await session.abortTransaction();
      return res.status(400).json({
        status: "failed",
        message: "Invalid seat ID format",
      });
    }

    // Find the seat
    const seat = await Seat.findById(seatId).session(session);
    if (!seat) {
      await session.abortTransaction();
      return res.status(404).json({ 
        status: "failed", 
        message: "Seat not found" 
      });
    }

    // Check if seat is available
    if (!seat.isAvailable) {
      await session.abortTransaction();
      return res.status(400).json({
        status: "failed",
        message: "This seat is already reserved",
        data: {
          reservedBy: seat.reservedBy,
          reservedAt: seat.reservedAt
        }
      });
    }

    // Check seat type
    if (seat.type !== "independent") {
      await session.abortTransaction();
      return res.status(400).json({
        status: "failed",
        message: "Only 'independent' type seats can be reserved",
        allowedTypes: ["independent"]
      });
    }

    // Check user role
    if (res.locals.role !== "student") {
      await session.abortTransaction();
      return res.status(403).json({
        status: "failed",
        message: "Only students can reserve a seat",
        requiredRole: "student"
      });
    }

    // Check existing reservation
    const existingReservation = await Seat.findOne({
      reservedBy: studentId,
      isAvailable: false
    }).session(session);

    if (existingReservation) {
      await session.abortTransaction();
      return res.status(400).json({
        status: "failed",
        message: "You have already reserved a seat",
        actionRequired: "Please release your current seat before reserving another",
        data: {
          reservedSeatId: existingReservation._id,
          seatNumber: existingReservation.seatNumber,
          reservedAt: existingReservation.reservedAt
        }
      });
    }

    // Calculate deadline
    const deadline = new Date();
    deadline.setMinutes(deadline.getMinutes() + seat.reservationDuration);

    // Reserve the seat
    seat.isAvailable = false;
    seat.reservedBy = studentId;
    seat.reservedAt = new Date();
    await seat.save({ session });

    // Remove any existing notifications for this seat
    await SeatReservationNotification.deleteMany({
      seatId: seat._id,
      requiresAction: true
    }).session(session);

    // Create new notification
    const notification = await SeatReservationNotification.create([{
      studentId: studentId,
      seatId: seat._id,
      message: `Seat ${seat.seatNumber} reserved until ${deadline.toLocaleTimeString()}. Continue using this seat?`,
      requiresAction: true,
      deadline: deadline,
      actionResponse: 'pending'
    }], { session });

    await session.commitTransaction();

    // Schedule automatic release check
    scheduleReleaseCheck(seat._id, deadline);

    return res.status(200).json({
      status: "success",
      message: "Seat reserved successfully",
      data: {
        seat: {
          id: seat._id,
          seatNumber: seat.seatNumber,
          type: seat.type,
          location: seat.location,
          reservedAt: seat.reservedAt,
          reservationDeadline: deadline
        },
        notification: {
          id: notification[0]._id,
          message: notification[0].message,
          requiresAction: notification[0].requiresAction,
          deadline: notification[0].deadline
        }
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Seat reservation error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to reserve seat",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    session.endSession();
  }
});

/**
 * Handle seat extension/release response
 */
const handleSeatResponse = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { notificationId, response } = req.body;
    const studentId = res.locals.id;

    // Validate response
    if (!['extend', 'release'].includes(response)) {
      await session.abortTransaction();
      return res.status(400).json({
        status: "failed",
        message: "Invalid response type"
      });
    }

    // Find notification
    const notification = await SeatReservationNotification.findById(notificationId).session(session);
    if (!notification || notification.studentId.toString() !== studentId) {
      await session.abortTransaction();
      return res.status(404).json({
        status: "failed",
        message: "Notification not found"
      });
    }

    // Find seat
    const seat = await Seat.findById(notification.seatId).session(session);
    if (!seat) {
      await session.abortTransaction();
      return res.status(404).json({
        status: "failed",
        message: "Seat not found"
      });
    }

    if (response === 'extend') {
      // Remove any other pending notifications for this seat
      await SeatReservationNotification.deleteMany({
        seatId: seat._id,
        requiresAction: true,
        _id: { $ne: notification._id }
      }).session(session);

      // Extend reservation
      const newDeadline = new Date();
      newDeadline.setMinutes(newDeadline.getMinutes() + seat.reservationDuration);
      
      seat.reservationDeadline = newDeadline;
      await seat.save({ session });

      // Update the single notification
      notification.actionResponse = 'pending';
      notification.message = `Seat ${seat.seatNumber} reservation extended until ${newDeadline.toLocaleTimeString()}. Continue using this seat?`;
      notification.deadline = newDeadline;
      notification.requiresAction = true;
      await notification.save({ session });

      // Schedule new automatic release check
      scheduleReleaseCheck(seat._id, newDeadline);

      await session.commitTransaction();
      return res.status(200).json({
        status: "success",
        message: "Seat reservation extended",
        data: {
          newDeadline: newDeadline,
          notificationId: notification._id
        }
      });
    } else {
      // Release seat
      seat.isAvailable = true;
      seat.reservedBy = null;
      seat.reservedAt = null;
      seat.releasedAt = new Date();
      await seat.save({ session });

      // Mark all notifications for this seat as resolved
      await SeatReservationNotification.updateMany(
        { seatId: seat._id, requiresAction: true },
        {
          actionResponse: 'release',
          message: `Seat ${seat.seatNumber} has been released.`,
          requiresAction: false
        }
      ).session(session);

      await session.commitTransaction();
      return res.status(200).json({
        status: "success",
        message: "Seat released successfully"
      });
    }
  } catch (error) {
    await session.abortTransaction();
    console.error("Seat response error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to process seat response",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    session.endSession();
  }
});

/**
 * Fetch pending notifications for a student
 */
const fetchPendingNotifications = asyncHandler(async (req, res) => {
  const studentId = res.locals.id;

  try {
    // Get only the latest notification per seat
    const notifications = await SeatReservationNotification.aggregate([
      {
        $match: {
          studentId: new mongoose.Types.ObjectId(studentId),
          requiresAction: true,
          actionResponse: 'pending'
        }
      },
      {
        $sort: { deadline: 1 }
      },
      {
        $group: {
          _id: "$seatId",
          notification: { $first: "$$ROOT" }
        }
      },
      {
        $replaceRoot: { newRoot: "$notification" }
      }
    ]);

    return res.status(200).json({
      status: "success",
      message: "Pending notifications retrieved successfully",
      data: notifications.map(notification => ({
        id: notification._id,
        message: notification.message,
        deadline: notification.deadline,
        seatId: notification.seatId
      }))
    });
  } catch (error) {
    console.error("Error fetching pending notifications:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch pending notifications",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});



// @desc    Release a seat (Only students)
// @route   POST /api/seats/release/:id
// @access  Private (student)


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
    

    
  };