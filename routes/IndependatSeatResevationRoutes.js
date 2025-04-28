const express = require("express");
const router = express.Router();
const { protect,checkRole, checkUserExists} = require('../middleware/auth');

const seatIndependatController = require('../controller/IndependatSeatResevationController');



router.post("/reserve/:id",protect,checkRole("student"), checkUserExists,seatIndependatController.reserveSeat);
router.post("/release/:id",protect,checkRole("student"), checkUserExists,seatIndependatController.releaseSeat);

router.get("/reserve/read",seatIndependatController.getIndependentSeats);
router.get("/reserve/forstaff",protect,checkRole("library-staff"), checkUserExists,seatIndependatController.getAllReservedSeats);
router.get("/reserve/forstaff/count",protect,checkRole("library-staff"), checkUserExists,seatIndependatController.countReservedSeats);

router.put('/releasebystaff/:seatId',protect,checkRole("library-staff"), checkUserExists,seatIndependatController.releaseSeatByStaff);

router.post("/handle-seat-response", protect, checkRole("student"), checkUserExists, seatIndependatController.handleSeatResponse);


router.get("/SeatNotfication",protect,checkRole("student"), checkUserExists, seatIndependatController.fetchPendingNotifications);

router.get('/test-auto-release/:seatId', staffAuth, async (req, res) => {
    try {
      const result = await seatIndependatController.autoReleaseSeat(req.params.seatId);
      if (result.released) {
        res.status(200).json({
          status: "success",
          message: `Seat ${result.seatNumber} released for student ${result.studentId}`,
          notificationSent: true
        });
      } else {
        res.status(400).json({
          status: "failed",
          message: result.message
        });
      }
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Auto-release failed",
        error: error.message
      });
    }
  });




module.exports = router;

