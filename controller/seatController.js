const seatModel = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");

// @desc    Create a new seat (Only library-staff)
// @route   POST /api/seats
// @access  Private (library-staff)
const createSeat = asyncHandler(async (req, res) => {
  try {
    const { seatNumber, location } = req.body;

    // Ensure the logged-in user is library-staff
    if (res.locals.role !== "library-staff") {
      return res.status(403).json({
        status: "failed",
        message: "Only library-staff can create a seat",
      });
    }

    // Validate input fields
    if (!seatNumber || !location) {
      return res.status(400).json({
        status: "failed",
        message: "All fields (seatNumber, location) are required",
      });
    }

    // Ensure req.user exists and has an ID
    if (!res.locals.id) {
      return res.status(401).json({
        status: "failed",
        message: "User not authenticated",
      });
    }

    // Check if the seat already exists
    const existingSeat = await seatModel.findOne({ seatNumber });
    if (existingSeat) {
      return res.status(400).json({
        status: "failed",
        message: "Seat already exists",
      });
    }

    // Create the seat
    const seat = await seatModel.create({
      seatNumber,
      location,
      managedBy: res.locals.id, // Assign the seat to the library-staff
    });

    res.status(201).json({
      status: "success",
      message: "Seat created successfully",
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

// @desc    Get all seats (Only library-staff)
// @route   GET /api/seats
// @access  Private (library-staff)
const getSeats = asyncHandler(async (req, res) => {
  try {
    // Fetch all seats and populate the managedBy field
    const seats = await seatModel.find().populate("managedBy", "name email");

    res.status(200).json({
      status: "success",
      results: seats.length,
      data: seats,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// @desc    Update a seat (Only library-staff)
// @route   PATCH /api/seats/:id
// @access  Private (library-staff)
const updateSeat = asyncHandler(async (req, res) => {
  try {
    const { seatNumber, location, isAvailable } = req.body;
    const seatId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(seatId)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid seat ID format",
      });
    }

    // Find the seat
    const seat = await seatModel.findById(seatId);
    if (!seat) {
      return res.status(404).json({ status: "failed", message: "Seat not found" });
    }

    // Ensure the logged-in user is the library-staff managing the seat
    if (seat.managedBy.toString() !== res.locals.id.toString()) {
      return res.status(403).json({
        status: "failed",
        message: "You are not authorized to update this seat.",
      });
    }

    // Update the seat
    const updatedSeat = await seatModel.findByIdAndUpdate(
      seatId,
      { seatNumber, location, isAvailable },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      message: "Seat updated successfully",
      data: updatedSeat,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// @desc    Delete a seat (Only library-staff)
// @route   DELETE /api/seats/:id
// @access  Private (library-staff)
const deleteSeat = asyncHandler(async (req, res) => {
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
    const seat = await seatModel.findById(seatId);
    if (!seat) {
      return res.status(404).json({ status: "failed", message: "Seat not found" });
    }

    // Ensure the logged-in user is the library-staff managing the seat
    if (seat.managedBy.toString() !== res.locals.id.toString()) {
      return res.status(403).json({
        status: "failed",
        message: "You are not authorized to delete this seat.",
      });
    }

    // Delete the seat
    await seatModel.findByIdAndDelete(seatId);

    res.status(200).json({
      status: "success",
      message: "Seat deleted successfully",
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
  createSeat,
  getSeats,
  updateSeat,
  deleteSeat,
};