const Seat = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const SeatReservationNotification = require('../model/SeatReservationNotification');

// @desc    Reserve a seat (Only students)
// @route   POST /api/seats/reserve/:id
// @access  Private (student)



// Utility function to schedule automatic release
// Utility function to schedule automatic release
// const scheduleReleaseCheck = (seatId, deadline) => {
//   const now = new Date();
//   const timeUntilDeadline = deadline - now;
//   setTimeout(async () => {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//       const seat = await Seat.findById(seatId).session(session);
//       if (!seat || seat.isAvailable) {
//         await session.commitTransaction();
//         return;
//       }
      
//       // Check if there's still an active notification
//       const notification = await SeatReservationNotification.findOne({
//         seatId: seatId,
//         requiresAction: true
//       }).session(session);
      
//       if (notification) {
//         // Automatic release process
//         seat.isAvailable = true;
//         seat.reservedBy = null;
//         seat.reservedAt = null;
//         seat.releasedAt = new Date();
//         await seat.save({ session });
        
//         // Mark notification as completed
//         notification.requiresAction = false;
//         notification.actionResponse = 'auto-release';
//         notification.message = `Seat ${seat.seatNumber} was automatically released.`;
//         await notification.save({ session });
        
//         // Create release notification for user
//         await SeatReservationNotification.create([{
//           studentId: seat.reservedBy,
//           seatId: seat._id,
//           message: `Your seat ${seat.seatNumber} has been automatically released.`,
//           isRead: false,
//           requiresAction: false
//         }], { session });
//       }
      
//       await session.commitTransaction();
//     } catch (error) {
//       await session.abortTransaction();
//       console.error('Automatic release error:', error);
//     } finally {
//       session.endSession();
//     }
//   }, Math.max(0, timeUntilDeadline));
// };



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
        const studentId = seat.reservedBy;

        // Automatic release process
        seat.isAvailable = true;
        seat.reservedBy = null;
        seat.reservedAt = null;
        seat.releasedAt = new Date();
        await seat.save({ session });

        // Mark notification as completed
        notification.requiresAction = false;
        notification.actionResponse = 'auto-release';
        notification.message = `Seat ${seat.seatNumber} was automatically released.`;
        await notification.save({ session });

        // Create release notification for user
        await SeatReservationNotification.create([{
          studentId: studentId,
          seatId: seat._id,
          message: `Your seat ${seat.seatNumber} has been automatically released.`,
          isRead: false,
          requiresAction: false
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

// Auto release seat function (not used inside reserveSeat but can be used elsewhere)
const autoReleaseSeat = async (seatId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const seat = await Seat.findById(seatId).session(session);
    if (!seat || seat.isAvailable) {
      await session.commitTransaction();
      return { released: false, message: "Seat not found or already available" };
    }
    
    const studentId = seat.reservedBy;
    const seatNumber = seat.seatNumber;
    
    // Release the seat
    seat.isAvailable = true;
    seat.reservedBy = null;
    seat.reservedAt = null;
    seat.releasedAt = new Date();
    await seat.save({ session });

    // Update pending notifications
    await SeatReservationNotification.updateMany(
      { seatId: seatId, requiresAction: true },
      {
        requiresAction: false,
        actionResponse: 'auto-released',
        message: `Seat ${seatNumber} was automatically released due to inactivity.`,
        deadline: null
      }
    ).session(session);

    // Create new notification
    await SeatReservationNotification.create([{
      studentId: studentId,
      seatId: seat._id,
      message: `Your seat ${seatNumber} has been automatically released due to no response.`,
      isRead: false,
      requiresAction: false,
      actionResponse: 'auto-released',
      deadline: null
    }], { session });

    await session.commitTransaction();
    return { released: true, seatNumber, studentId };

  } catch (error) {
    await session.abortTransaction();
    console.error('Auto-release failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

// Reserve a seat
const reserveSeat = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const seatId = req.params.id;
    const studentId = res.locals.id;

    if (!mongoose.Types.ObjectId.isValid(seatId)) {
      await session.abortTransaction();
      return res.status(400).json({ status: "failed", message: "Invalid seat ID format" });
    }

    const existingReservation = await Seat.findOne({ reservedBy: studentId, isAvailable: false }).session(session);
    if (existingReservation) {
      await session.abortTransaction();
      return res.status(400).json({
        status: "failed",
        message: "You already have an active seat reservation",
        data: {
          reservedSeat: {
            id: existingReservation._id,
            seatNumber: existingReservation.seatNumber,
            reservedAt: existingReservation.reservedAt,
          },
        },
      });
    }

    const seat = await Seat.findById(seatId).session(session);
    if (!seat) {
      await session.abortTransaction();
      return res.status(404).json({ status: "failed", message: "Seat not found" });
    }

    if (!seat.isAvailable) {
      await session.abortTransaction();
      return res.status(400).json({
        status: "failed",
        message: "This seat is already reserved",
        data: {
          reservedBy: seat.reservedBy,
          reservedAt: seat.reservedAt,
        },
      });
    }

    seat.isAvailable = false;
    seat.reservedBy = studentId;
    seat.reservedAt = new Date();
    await seat.save({ session });

    const notificationTime = new Date();
    notificationTime.setMinutes(notificationTime.getMinutes() + 2);

    const deadline = new Date(notificationTime);
    deadline.setMinutes(deadline.getMinutes() + 1);

    await SeatReservationNotification.deleteMany({ seatId: seat._id, requiresAction: true }).session(session);

    setTimeout(async () => {
      const notificationSession = await mongoose.startSession();
      notificationSession.startTransaction();
      try {
        const currentSeat = await Seat.findById(seat._id).session(notificationSession);
        if (!currentSeat || currentSeat.isAvailable) {
          await notificationSession.commitTransaction();
          return;
        }

        await SeatReservationNotification.create([{
          studentId: studentId,
          seatId: seat._id,
          message: `Seat ${seat.seatNumber} reservation is ending soon. Extend or release this seat?`,
          requiresAction: true,
          deadline: deadline,
          actionResponse: "pending",
        }], { session: notificationSession });

        scheduleReleaseCheck(seat._id, deadline);

        await notificationSession.commitTransaction();
      } catch (error) {
        await notificationSession.abortTransaction();
        console.error("Error creating delayed notification:", error);
      } finally {
        notificationSession.endSession();
      }
    }, 2 * 60 * 1000);

    await session.commitTransaction();
    return res.status(200).json({
      status: "success",
      message: "Seat reserved successfully",
      data: {
        seat: {
          id: seat._id,
          seatNumber: seat.seatNumber,
          reservedAt: seat.reservedAt,
          nextNotificationTime: notificationTime,
          reservationDeadline: deadline,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Seat reservation error:", error);
    return res.status(500).json({ status: "error", message: "Failed to reserve seat", error: error.message });
  } finally {
    session.endSession();
  }
});

// Handle seat extension or release
const handleSeatResponse = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { notificationId, response } = req.body;
    const studentId = res.locals.id;

    if (!['extend', 'release'].includes(response)) {
      await session.abortTransaction();
      return res.status(400).json({ status: "failed", message: "Invalid response type" });
    }

    const notification = await SeatReservationNotification.findById(notificationId).session(session);
    if (!notification || notification.studentId.toString() !== studentId) {
      await session.abortTransaction();
      return res.status(404).json({ status: "failed", message: "Notification not found" });
    }

    const seat = await Seat.findById(notification.seatId).session(session);
    if (!seat) {
      await session.abortTransaction();
      return res.status(404).json({ status: "failed", message: "Seat not found" });
    }

    notification.requiresAction = false;
    notification.actionResponse = response;
    await notification.save({ session });

    if (response === 'extend') {
      const newNotificationTime = new Date();
      newNotificationTime.setMinutes(newNotificationTime.getMinutes() + 2);

      const newDeadline = new Date(newNotificationTime);
      newDeadline.setMinutes(newDeadline.getMinutes() + 1);

      setTimeout(async () => {
        const extensionSession = await mongoose.startSession();
        extensionSession.startTransaction();
        try {
          const currentSeat = await Seat.findById(seat._id).session(extensionSession);
          if (!currentSeat || currentSeat.isAvailable) {
            await extensionSession.commitTransaction();
            return;
          }

          await SeatReservationNotification.create([{
            studentId: studentId,
            seatId: seat._id,
            message: `Seat ${seat.seatNumber} reservation is ending soon. Extend or release this seat?`,
            requiresAction: true,
            deadline: newDeadline,
            actionResponse: 'pending'
          }], { session: extensionSession });

          scheduleReleaseCheck(seat._id, newDeadline);

          await extensionSession.commitTransaction();
        } catch (error) {
          await extensionSession.abortTransaction();
          console.error("Error creating extension notification:", error);
        } finally {
          extensionSession.endSession();
        }
      }, 2 * 60 * 1000);

      await session.commitTransaction();
      return res.status(200).json({
        status: "success",
        message: "Seat reservation extended",
        data: {
          nextNotificationTime: newNotificationTime,
          reservationDeadline: newDeadline
        }
      });
    } else {
      seat.isAvailable = true;
      seat.reservedBy = null;
      seat.reservedAt = null;
      seat.releasedAt = new Date();
      await seat.save({ session });

      await session.commitTransaction();
      return res.status(200).json({
        status: "success",
        message: "Seat released successfully"
      });
    }

  } catch (error) {
    await session.abortTransaction();
    console.error("Handle seat response error:", error);
    return res.status(500).json({ status: "error", message: "Failed to process seat response", error: error.message });
  } finally {
    session.endSession();
  }
});

// Export the controllers



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
    autoReleaseSeat,
    

    
  };