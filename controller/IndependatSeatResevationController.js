const Seat = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const SeatReservationNotification = require('../model/SeatReservationNotification');

// @desc    Reserve a seat (Only students)
// @route   POST /api/seats/reserve/:id
// @access  Private (student)



// Utility function to schedule automatic release
// Utility function to schedule automatic release
// utils.js or helper inside same file



// Helper to schedule a notification and a future release
const scheduleNotificationAndRelease = (seatId, studentId, seatNumber, notificationDelayMinutes, deadlineMinutes) => {
  setTimeout(async () => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const seat = await Seat.findById(seatId).session(session);
      if (!seat || seat.isAvailable) {
        await session.commitTransaction();
        return;
      }

      const notificationTime = new Date();
      notificationTime.setMinutes(notificationTime.getMinutes() + notificationDelayMinutes);
      const deadline = new Date(notificationTime);
      deadline.setMinutes(deadline.getMinutes() + deadlineMinutes);

      await SeatReservationNotification.create([{
        studentId,
        seatId,
        message: `Seat ${seatNumber} reservation is ending soon. Extend or release this seat?`,
        requiresAction: true,
        deadline,
        actionResponse: 'pending'
      }], { session });

      scheduleReleaseCheck(seatId, deadline);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error("Error scheduling notification and release:", error);
    } finally {
      session.endSession();
    }
  }, notificationDelayMinutes * 60 * 1000);
};


// Helper to schedule automatic seat release
const scheduleReleaseCheck = async (seatId, deadline) => {
  try {
    const now = new Date();
    const timeUntilDeadline = deadline - now;

    if (timeUntilDeadline <= 0) {
      await autoReleaseSeat(seatId);
      return;
    }

    setTimeout(async () => {
      await autoReleaseSeat(seatId);
    }, timeUntilDeadline);
  } catch (error) {
    console.error('Error scheduling seat release:', error);
  }
};


// Helper to auto-release a seat if no response
const autoReleaseSeat = async (seatId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const seat = await Seat.findById(seatId).session(session);
    if (!seat || seat.isAvailable) {
      await session.commitTransaction();
      return;
    }

    const notification = await SeatReservationNotification.findOne({
      seatId,
      requiresAction: true
    }).session(session);

    if (notification) {
      const previousStudentId = seat.reservedBy; // Save before setting it null

      seat.isAvailable = true;
      seat.reservedBy = null;
      seat.reservedAt = null;
      seat.releasedAt = new Date();
      await seat.save({ session });

      notification.requiresAction = false;
      notification.actionResponse = 'auto-release';
      notification.message = `Seat ${seat.seatNumber} was automatically released after timeout.`;
      await notification.save({ session });

      if (previousStudentId) {
        await SeatReservationNotification.create([{
          studentId: previousStudentId,
          seatId: seat._id,
          message: `Your seat ${seat.seatNumber} has been automatically released.`,
          isRead: false,
          requiresAction: false
        }], { session });
      }

      console.log(`Seat ${seat.seatNumber} automatically released.`);
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in autoReleaseSeat:', error);
  } finally {
    session.endSession();
  }
};


// Reserve a seat
const reserveSeat = async (req, res) => {
  const { seatNumber, studentId } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const seat = await Seat.findOne({ seatNumber }).session(session);
    if (!seat) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Seat not found' });
    }
    if (!seat.isAvailable) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Seat already reserved' });
    }

    seat.isAvailable = false;
    seat.reservedBy = studentId;
    seat.reservedAt = new Date();
    seat.releasedAt = null;
    await seat.save({ session });

    await SeatReservationNotification.deleteMany({
      seatId: seat._id,
      requiresAction: true
    }).session(session);

    scheduleNotificationAndRelease(seat._id, studentId, seat.seatNumber, 2, 1);

    await session.commitTransaction();
    res.status(200).json({ message: 'Seat reserved successfully' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error reserving seat:', error);
    res.status(500).json({ message: 'Error reserving seat' });
  } finally {
    session.endSession();
  }
};


// Handle student response to notification (extend or release)
const handleSeatResponse = async (req, res) => {
  const { notificationId, response } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const notification = await SeatReservationNotification.findById(notificationId).session(session);
    if (!notification) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Notification not found' });
    }

    const seat = await Seat.findById(notification.seatId).session(session);
    if (!seat) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Seat not found' });
    }

    if (response === 'extend') {
      notification.requiresAction = false;
      notification.actionResponse = 'extend';
      await notification.save({ session });

      scheduleNotificationAndRelease(seat._id, notification.studentId, seat.seatNumber, 2, 1);

      await session.commitTransaction();
      res.status(200).json({ status: "success", message: "Seat reservation extended" });

    } else if (response === 'release') {
      seat.isAvailable = true;
      seat.reservedBy = null;
      seat.reservedAt = null;
      seat.releasedAt = new Date();
      await seat.save({ session });

      notification.requiresAction = false;
      notification.actionResponse = 'release';
      await notification.save({ session });

      await session.commitTransaction();
      res.status(200).json({ status: "success", message: "Seat reservation released" });
    } else {
      await session.abortTransaction();
      res.status(400).json({ message: 'Invalid response' });
    }
  } catch (error) {
    await session.abortTransaction();
    console.error('Error handling seat response:', error);
    res.status(500).json({ message: 'Error handling seat response' });
  } finally {
    session.endSession();
  }
};


// Get pending notifications
const  fetchPendingNotifications = async (req, res) => {
  try {
    const { studentId } = req.params;
    const notifications = await SeatReservationNotification.find({
      studentId,
      requiresAction: true
    }).populate('seatId');
    res.status(200).json({ status: "success", data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};



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
    

    
  };