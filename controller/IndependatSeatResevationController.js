const Seat = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");

// @desc    Reserve a seat (Only students)
// @route   POST /api/seats/reserve/:id
// @access  Private (student)
const reserveSeat = asyncHandler(async (req, res) => {
  try {
    const seatId = req.params.id;

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

    // Check if the student has already reserved a seat
    const existingReservation = await Seat.findOne({
      reservedBy: res.locals.id,
      isAvailable: false,
    });

    if (existingReservation) {
      return res.status(400).json({
        status: "failed",
        message: "You have already reserved a seat. Please release it before reserving another.",
      });
    }

    // Reserve the seat
    seat.isAvailable = false;
    seat.reservedBy = res.locals.id; // Assign the seat to the student
    seat.reservedAt = new Date(); // Record the reservation time

    await seat.save();

    // Include the seat ID in the response
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
const releaseSeat = asyncHandler(async (req, res) => {
  try {
    const seatId = req.params.id;

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

    // Check if the seat is already available
    if (seat.isAvailable) {
      return res.status(400).json({
        status: "failed",
        message: "This seat is already available and cannot be released",
      });
    }

    // Ensure the logged-in user is the one who reserved the seat
    if (seat.reservedBy.toString() !== res.locals.id.toString()) {
      return res.status(403).json({
        status: "failed",
        message: "You are not authorized to release this seat",
      });
    }

    // Release the seat
    seat.isAvailable = true; // Mark the seat as available
    seat.reservedBy = null; // Clear the reservation
    seat.releasedAt = new Date(); // Record the release time

    await seat.save();

    res.status(200).json({
      status: "success",
      message: "Seat released successfully",
      data: seat,
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
const getIndependentSeats = asyncHandler(async (req, res) => {
  try {
    // Fetch only seats of type "independent"
    const independentSeats = await Seat.find({ type: "independent" })
      .populate("reservedBy", "name email") // Populate reservedBy with user details (optional)
      .populate("managedBy", "name email"); // Populate managedBy with staff details (optional)

    // Categorize seats into available and occupied
    const availableSeats = independentSeats.filter((seat) => seat.isAvailable);
    const occupiedSeats = independentSeats.filter((seat) => !seat.isAvailable);

    res.status(200).json({
      status: "success",
      results: independentSeats.length,
      data: {
        availableSeats,
        occupiedSeats,
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










  module.exports = {
    reserveSeat,
    getIndependentSeats,
    releaseSeat,
    
  };