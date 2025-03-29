const Seat = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");

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

    // Reserve the seat
    seat.isAvailable = false;
    seat.reservedBy = studentId;
    seat.reservedAt = new Date();

    await seat.save();

    res.status(200).json({
      status: "success",
      message: "Seat reserved successfully",
      data: {
        id: seat._id,
        seatNumber: seat.seatNumber,
        type: seat.type,
        location: seat.location,
        isAvailable: seat.isAvailable,
        reservedBy: seat.reservedBy,
        reservedAt: seat.reservedAt,
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


const getReservedStudentBySeatNumber = asyncHandler(async (req, res) => {
  try {
    const { seatNumber } = req.params;
    

   

    // Find the seat by seatNumber
    const seat = await Seat.findOne({ seatNumber }).populate('reservedBy', 'name email studentId');

    if (!seat) {
      return res.status(404).json({
        status: "failed",
        message: "Seat not found",
      });
    }

    if (seat.isAvailable) {
      return res.status(400).json({
        status: "failed",
        message: "This seat is not reserved",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Reserved student fetched successfully",
      data: {
        seatId: seat._id,
        seatNumber: seat.seatNumber,
        reservedBy: seat.reservedBy,
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
    getReservedStudentBySeatNumber,
    
  };