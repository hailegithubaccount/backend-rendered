const Seat = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");

// @desc    Create a new seat (Only library-staff)
// @route   POST /api/seats
// @access  Private (library-staff)
const createSeat = asyncHandler(async (req, res) => {
  try {
    const { seatNumber, type, location, description, Direction} = req.body;

    // Ensure the logged-in user is library-staff
    if (res.locals.role !== "library-staff") {
      return res.status(403).json({
        status: "failed",
        message: "Only library-staff can create a seat",
      });
    }

    // Validate input fields
    if (!seatNumber || !type || !location) {
      return res.status(400).json({
        status: "failed",
        message: "All fields (seatNumber, type, location) are required",
      });
    }

    // Validate type
    if (!["book", "independent"].includes(type)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid seat type. Must be 'book' or 'independent'.",
      });
    }

    // Check if the seat already exists
    const existingSeat = await Seat.findOne({ seatNumber });
    if (existingSeat) {
      return res.status(400).json({
        status: "failed",
        message: "Seat already exists",
      });
    }

    // Create the seat
    const seat = await Seat.create({
      seatNumber,
      type,
      location,
      Direction,
      description: description || "", // Add description if provided
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

// @desc    Update a seat (Only library-staff)
// @route   PATCH /api/seats/:id
// @access  Private (library-staff)
const updateSeat = asyncHandler(async (req, res) => {
  try {
    const { seatNumber, type, isAvailable, location, description, Direction } = req.body;
    const seatId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(seatId)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid seat ID format",
      });
    }

    // Find the seat
    //fjdfnmmkkkd
    const seat = await Seat.findById(seatId);
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

    // Validate type if provided
    if (type && !["book", "independent"].includes(type)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid seat type. Must be 'book' or 'independent'.",
      });
    }

    // Prepare update data
    const updateData = {
      ...(seatNumber && { seatNumber }),
      ...(type && { type }),
      ...(typeof isAvailable !== 'undefined' && { isAvailable }),
      ...(location && { location }),
      ...( Direction && { Direction}),
      ...(description && { description }),
    };

    // Update the seat
    const updatedSeat = await Seat.findByIdAndUpdate(
      seatId,
      updateData,
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

// @desc    Get all seats (Only library-staff)
// @route   GET /api/seats
// @access  Private (library-staff)
const getSeats = asyncHandler(async (req, res) => {
  try {
    // Optional filtering by query parameters
    const { type, location, isAvailable, Direction } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if( Direction) filter.Direction= Direction;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (isAvailable) filter.isAvailable = isAvailable === 'true';

    // Fetch all seats with optional filtering and populate the managedBy field
    const seats = await Seat.find(filter).populate("managedBy", "name email");

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

// @desc    Get a single seat
// @route   GET /api/seats/:id
// @access  Private
const getSeat = asyncHandler(async (req, res) => {
  try {
    const seatId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(seatId)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid seat ID format",
      });
    }

    // Find the seat and populate managedBy
    const seat = await Seat.findById(seatId).populate("managedBy", "name email");
    if (!seat) {
      return res.status(404).json({ status: "failed", message: "Seat not found" });
    }

    res.status(200).json({
      status: "success",
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
    const seat = await Seat.findById(seatId);
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
    await Seat.findByIdAndDelete(seatId);

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


//count all seat whetheat book or independant
const countAllSeats = asyncHandler(async (req, res) => {
  try {
    const count = await Seat.countDocuments();
    res.status(200).json({
      status: "success",
      data: { count },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to count seats",
      error: error.message,
    });
  }
});

/// count all book seat count 

const countBookSeats = asyncHandler(async (req, res) => {
  try {
    const count = await Seat.countDocuments({ type: "book" });
    res.status(200).json({
      status: "success",
      data: { count },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to count book seats",
      error: error.message,
    });
  }
});

// count all indepnedat seat

const countIndependentSeats = asyncHandler(async (req, res) => {
  try {
    const count = await Seat.countDocuments({ type: "independent" });
    res.status(200).json({
      status: "success",
      data: { count },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to count independent seats",
      error: error.message,
    });
  }
});



module.exports = {
  createSeat,
  getSeats,
  getSeat,
  updateSeat,
  deleteSeat,
  countIndependentSeats,
  countBookSeats,
  countAllSeats, 
};