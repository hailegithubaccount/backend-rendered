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
            name: res.locals.user.name
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
    getBookSeats
   
    
    
  };