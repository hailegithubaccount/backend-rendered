const express = require("express");
const router = express.Router();
const { protect,checkRole, checkUserExists} = require('../middleware/auth');

const seatIndependatController = require('../controller/IndependatSeatResevationController');



router.post("/reserve/:id",protect,checkRole("student"), checkUserExists,seatIndependatController.reserveSeat);
router.post("/release/:id",protect,checkRole("student"), checkUserExists,seatIndependatController.releaseSeat);
router.post('/notifications/:id/respond', checkRole('student'),checkUserExists,seatIndependatController.handleNotificationResponse);
router.get("/reserve/read",seatIndependatController.getIndependentSeats);
router.get("/reserve/forstaff",protect,checkRole("library-staff"), checkUserExists,seatIndependatController.getReservedIndependentSeats);
router.put('/releasebystaff/:seatId',protect,checkRole("library-staff"), checkUserExists,seatIndependatController.releaseSeatByStaff);




module.exports = router;

