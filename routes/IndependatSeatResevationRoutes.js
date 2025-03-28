const express = require("express");
const router = express.Router();
const { protect,checkRole, checkUserExists} = require('../middleware/auth');

const seatIndependatController = require('../controller/IndependatSeatResevationController');



router.post("/reserve/:id",protect,checkRole("student"), checkUserExists,seatIndependatController.reserveSeat);
router.post("/release/:id",protect,checkRole("student"), checkUserExists,seatIndependatController.releaseSeat);
router.get("/reserve/read",seatIndependatController.getIndependentSeats);


module.exports = router;


