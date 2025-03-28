const express = require("express");
const router = express.Router();

const seatIndependatController = require('../controller/IndependatSeatResevationController');



router.post("/reserve/id",protect,checkRole("student"), checkUserExists,seatIndependatController.reserveSeat);


module.exports = router;


