const Seat = require("../model/seatModel");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");


const getBookSeats = asyncHandler(async (req, res) => {
    try {
        // Authorization check
        if (res.locals.user?.role !== "library-staff") {
            return res.status(403).json({
                status: "fail",
                code: 403,
                message: "Unauthorized access. Only library staff can view book seats.",
            });
        }

        // Validate and parse query parameters
        const populate = req.query.populate === 'true';
        const { location } = req.query;
        
        // Build base query
        let query = Seat.find({ type: "book" });
        
        // Apply location filter if provided
        if (location && ['north', 'south', 'east', 'west'].includes(location)) {
            query = query.where('location').equals(location);
        }
        
        // Apply population if requested
        if (populate) {
            query = query.populate({
                path: 'reservedBy',
                select: 'name email studentId',
                options: { lean: true }
            });
        }
        
        // Execute query
        const bookSeats = await query.lean().exec();
        
        if (!bookSeats.length) {
            return res.status(200).json({
                status: "success",
                code: 200,
                message: "No book seats found",
                data: {
                    availableSeats: [],
                    occupiedSeats: [],
                    total: 0
                }
            });
        }
        
        // Categorize seats
        const availableSeats = bookSeats.filter(seat => seat.isAvailable);
        const occupiedSeats = bookSeats.filter(seat => !seat.isAvailable);
        
        // Prepare response
        const response = {
            status: "success",
            code: 200,
            message: "Book seats retrieved successfully",
            data: {
                total: bookSeats.length,
                available: availableSeats.length,
                occupied: occupiedSeats.length,
                availableSeats,
                occupiedSeats,
                metadata: {
                    populated: populate,
                    locationFilter: location || 'all',
                    accessedAt: new Date().toISOString(),
                    accessedBy: {
                        staffId: res.locals.user._id,
                        name: res.locals.user.name
                    }
                }
            }
        };
        
        res.status(200).json(response);
        
    } catch (error) {
        console.error('Error fetching book seats:', error);
        res.status(500).json({
            status: "error",
            code: 500,
            message: "Internal server error while fetching book seats",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


const getAllReservedBookSeats = asyncHandler(async (req, res) => {
  // 1. Role check
  if (res.locals.user?.role !== "library-staff") {
    return res.status(403).json({
      status: "failed",
      message: "Access denied. Only library staff can fetch reserved book seats.",
    });
  }

  // 2. Fetch reserved book seats
  const reservedSeats = await Seat.find({ type: "book", isAvailable: false })
    .populate("reservedBy", "name email studentId")
    .lean();

  // 3. If none, return empty array
  return res.status(200).json({
    status: "success",
    message: reservedSeats.length
      ? "Reserved book seats fetched successfully"
      : "No reserved book seats found",
    count: reservedSeats.length,
    data: reservedSeats,
  });
});



const countReservedBookSeats = asyncHandler(async (req, res) => {
  // 1. Role check
  if (res.locals.user?.role !== "library-staff") {
    return res.status(403).json({
      status: "failed",
      message: "Access denied. Only library staff can view reserved book seat count.",
    });
  }

  // 2. Count reserved book seats
  const count = await Seat.countDocuments({ type: "book", isAvailable: false });

  // 3. Return the count
  res.status(200).json({
    status: "success",
    count,
  });
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
    getAllReservedBookSeats,
    countReservedBookSeats,
   
    
    
  };