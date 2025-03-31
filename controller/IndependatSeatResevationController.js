const Seat = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const SeatReservationNotification = require('../model/SeatReservationNotification');

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
      return res.status(404).json({ 
        status: "failed", 
        message: "Seat not found" 
      });
    }

    // Check if the seat is already reserved
    if (!seat.isAvailable) {
      return res.status(400).json({
        status: "failed",
        message: "This seat is already reserved",
        data: {
          reservedBy: seat.reservedBy,
          reservedAt: seat.reservedAt
        }
      });
    }

    // Ensure the seat type is "independent"
    if (seat.type !== "independent") {
      return res.status(400).json({
        status: "failed",
        message: "Only 'independent' type seats can be reserved",
        allowedTypes: ["independent"]
      });
    }

    // Ensure the logged-in user is a student
    if (res.locals.role !== "student") {
      return res.status(403).json({
        status: "failed",
        message: "Only students can reserve a seat",
        requiredRole: "student"
      });
    }

    // Check if the student has already reserved ANY seat
    const existingReservation = await Seat.findOne({
      reservedBy: studentId,
      isAvailable: false
    });

    if (existingReservation) {
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

    // Start a transaction to ensure atomic operations
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Reserve the seat
      seat.isAvailable = false;
      seat.reservedBy = studentId;
      seat.reservedAt = new Date();
      const savedSeat = await seat.save({ session });

      // Create the reservation notification
      const notification = await SeatReservationNotification.create([{
        studentId: studentId,
        seatId: seat._id,
        message: `Seat ${seat.seatNumber} reservation confirmed! Welcome to ${seat.location}.`
      }], { session });

      await session.commitTransaction();

      // Successful response
      return res.status(200).json({
        status: "success",
        message: "Seat reserved successfully",
        data: {
          seat: {
            id: savedSeat._id,
            seatNumber: savedSeat.seatNumber,
            type: savedSeat.type,
            location: savedSeat.location,
            isAvailable: savedSeat.isAvailable,
            reservedBy: savedSeat.reservedBy,
            reservedAt: savedSeat.reservedAt
          },
          notification: {
            id: notification[0]._id,
            message: notification[0].message,
            createdAt: notification[0].createdAt
          }
        }
      });

    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error("Seat reservation error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to reserve seat",
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
    
  };