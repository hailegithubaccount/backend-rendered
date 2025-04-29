const Seat = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const SeatReservationNotification = require('../model/SeatReservationNotification');

// @desc    Reserve a seat (Only students)
// @route   POST /api/seats/reserve/:id
// @access  Private (student)

const Agenda = require('agenda');

// Utility function to schedule automatic release

const agenda = new Agenda({
  db: { address: process.env.MONGO_URI, collection: 'agendaJobs' },
  processEvery: '30 seconds'
});

// ========== Job: Send Notification ==========
agenda.define('send reservation notification', async (job) => {
  const { seatId, studentId } = job.attrs.data;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const seat = await Seat.findById(seatId).session(session);
    if (!seat || seat.isAvailable) {
      await session.commitTransaction();
      return;
    }

    const deadline = new Date(Date.now() + 30 * 1000); // 30 seconds from now

    await SeatReservationNotification.create([{
      studentId,
      seatId,
      message: `Seat ${seat.seatNumber} reservation is ending soon. Extend or release this seat?`,
      requiresAction: true,
      deadline,
      actionResponse: 'pending'
    }], { session });

    await agenda.schedule(deadline, 'auto release seat', {
      seatId,
      studentId
    });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    console.error('Error in "send reservation notification":', err);
  } finally {
    session.endSession();
  }
});

// ========== Job: Auto Release Seat ==========
agenda.define('auto release seat', async (job) => {
  const { seatId, studentId } = job.attrs.data;
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
      seat.isAvailable = true;
      seat.reservedBy = null;
      seat.reservedAt = null;
      seat.releasedAt = new Date();
      await seat.save({ session });

      notification.requiresAction = false;
      notification.actionResponse = 'autoRelease';
      notification.message = `Seat ${seat.seatNumber} was automatically released.`;
      await notification.save({ session });

      await SeatReservationNotification.create([{
        studentId,
        seatId,
        message: `Your seat ${seat.seatNumber} has been automatically released.`,
        isRead: false,
        requiresAction: false
      }], { session });
    }

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    console.error('Error in "auto release seat":', err);
  } finally {
    session.endSession();
  }
});

// Start Agenda
mongoose.connection.on('connected', () => {
  agenda.start().then(() => {
    console.log('Agenda job scheduler started');
  });
});

// ========== Reserve Seat ==========
const reserveSeat = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const seatId = req.params.id;
    const studentId = res.locals.id;

    if (!mongoose.Types.ObjectId.isValid(seatId)) {
      throw new Error("Invalid seat ID format");
    }

    const existing = await Seat.findOne({ reservedBy: studentId, isAvailable: false }).session(session);
    if (existing) {
      throw new Error("You already have an active seat reservation");
    }

    const seat = await Seat.findById(seatId).session(session);
    if (!seat || !seat.isAvailable) {
      throw new Error("Seat not found or already reserved");
    }

    seat.isAvailable = false;
    seat.reservedBy = studentId;
    seat.reservedAt = new Date();
    await seat.save({ session });

    const notificationTime = new Date(Date.now() + 30 * 1000);

    // Cancel any existing jobs for this seat
    await agenda.cancel({ 'data.seatId': seat._id });

    await agenda.schedule(notificationTime, 'send reservation notification', {
      seatId: seat._id,
      studentId
    });

    await session.commitTransaction();

    res.status(200).json({
      status: "success",
      message: "Seat reserved successfully",
      data: {
        seat: {
          id: seat._id,
          seatNumber: seat.seatNumber,
          reservedAt: seat.reservedAt,
          nextNotificationTime: notificationTime
        }
      }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ status: "failed", message: error.message });
  } finally {
    session.endSession();
  }
});

// ========== Handle Seat Response ==========
const handleSeatResponse = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { notificationId, response } = req.body;
    const studentId = res.locals.id;

    if (!['extend', 'release'].includes(response)) {
      throw new Error("Invalid response type");
    }

    const notification = await SeatReservationNotification.findById(notificationId).session(session);
    if (!notification || notification.studentId.toString() !== studentId) {
      throw new Error("Notification not found or unauthorized");
    }

    const seat = await Seat.findById(notification.seatId).session(session);
    if (!seat) {
      throw new Error("Seat not found");
    }

    // Mark notification handled
    notification.requiresAction = false;
    notification.actionResponse = response;
    await notification.save({ session });

    await agenda.cancel({ 'data.seatId': seat._id, 'data.studentId': studentId });

    if (response === 'extend') {
      const nextNotificationTime = new Date(Date.now() + 2 * 60 * 1000); // 2 mins
      const deadline = new Date(nextNotificationTime.getTime() + 60 * 1000); // 1 min after

      await SeatReservationNotification.create([{
        studentId,
        seatId: seat._id,
        message: `Seat ${seat.seatNumber} reservation extended. Next reminder at ${nextNotificationTime.toLocaleTimeString()}`,
        isRead: false,
        requiresAction: false
      }], { session });

      await agenda.schedule(nextNotificationTime, 'send reservation notification', {
        seatId: seat._id,
        studentId
      });

      await session.commitTransaction();
      return res.status(200).json({
        status: "success",
        message: "Seat reservation extended",
        data: {
          nextNotificationTime,
          deadline
        }
      });
    }

    // Else: release
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

    await SeatReservationNotification.updateMany(
      { seatId: seat._id, requiresAction: true },
      {
        actionResponse: 'released',
        requiresAction: false,
        message: `Seat ${seat.seatNumber} has been released.`
      }
    ).session(session);

    await session.commitTransaction();
    res.status(200).json({ status: "success", message: "Seat released successfully" });

  } catch (error) {
    await session.abortTransaction();
    console.error("Seat response error:", error);
    res.status(400).json({ status: "failed", message: error.message });
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