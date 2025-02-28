const express = require("express");
const router = express.Router();
const seatController= require("../controller/seatController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); 

//insert seat
router.post("/insertSeat",protect,checkRole("library-staff"), checkUserExists, seatController.createSeat);

//get seat
router.get("/readSeat",protect,checkRole("library-staff"), checkUserExists, seatController.getSeats);

// //get seat by id
// router.get("/readSeat:id",protect,checkRole("library-staff"), checkUserExists, seatController.getSeatById);


// Update a book
router.patch("/updateSeat:id",protect,checkRole("library-staff"), checkUserExists, seatController.updateSeat);

// Delete a book
router.delete("/deleteSeat:id",protect,checkRole("library-staff"), checkUserExists, seatController.deleteSeat );

module.exports = router;