const Seat = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");


const getBookSeats = asyncHandler(async (req, res) => {
    try {
      // Ensure only library staff can access this route
      if (res.locals.role !== "library-staff") {
        return res.status(403).json({
          status: "failed",
          message: "Access denied. Only library staff can fetch book seats.",
        });
      }
  
      const { populate = 'false' } = req.query;
      
      let query = Seat.find({ type: "book" });
      
      if (populate === 'true') {
        query = query.populate({
          path: 'reservedBy',
          select: 'name email' // Only include these fields
        });
      }
  
      const bookSeats = await query.exec();
      
      // Categorize seats
      const availableSeats = bookSeats.filter(seat => seat.isAvailable);
      const occupiedSeats = bookSeats.filter(seat => !seat.isAvailable);
  
      res.status(200).json({
        status: "success",
        results: bookSeats.length,
        data: {
          availableSeats,
          occupiedSeats,
          populated: populate === 'true',
          accessedBy: {
            staffId: res.locals.id,
            name: res.locals.name
          }
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




// @desc    Release occupied seat (Library Staff only)
// @route   PUT /api/seats/release/:id
// @access  Private/LibraryStaff
const releaseBookSeatByStaff = asyncHandler(async (req, res) => {
  try {
    // Verify library staff role
    if (res.locals.role !== "library-staff") {
      return res.status(403).json({
        status: "failed",
        message: "Access denied. Only library staff can release seats.",
      });
    }

    const seatId = req.params.id;
    
    // Find the seat and verify it's a book type and occupied
    const seat = await Seat.findOne({
      _id: seatId,
      type: "book",
      isAvailable: false
    });

    if (!seat) {
      return res.status(404).json({
        status: "fail",
        message: "Seat not found, already available, or not a bookable seat"
      });
    }

    // Update seat to available and record who released it
    const releasedSeat = await Seat.findByIdAndUpdate(
      seatId,
      {
        isAvailable: true,
        reservedBy: null,
        reservedAt: null,
        releasedAt: Date.now(),
        releasedBy: res.locals.id
      },
      { new: true }
    ).populate('reservedBy', 'name email');

    res.status(200).json({
      status: "success",
      message: "Seat released successfully",
      data: {
        seat: releasedSeat,
        releasedBy: {
          staffId: res.locals.id,
          name: res.locals.name,
          email: res.locals.email
        }
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






 module.exports = {
    getBookSeats,
    releaseBookSeatByStaff, 
   
    
    
  };