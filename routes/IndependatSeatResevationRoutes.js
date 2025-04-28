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
router.post('/schedule-release', protect,checkRole("student"), checkUserExists, async (req, res) => {
    try {
      const { seatId, deadline } = req.body;
      
      if (!seatId || !deadline) {
        return res.status(400).json({
          status: "failed",
          message: "seatId and deadline are required"
        });
      }
  
      seatIndependatController.scheduleReleaseCheck(seatId, new Date(deadline));
      
      res.status(200).json({
        status: "success",
        message: "Release scheduled successfully",
        data: {
          seatId,
          deadline: new Date(deadline)
        }
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to schedule release",
        error: error.message
      });
    }
  });

  router.post('/trigger-release/:seatId', protect,checkRole("student"), checkUserExists, async (req, res) => {
    try {
      await seatIndependatController.autoReleaseSeat(req.params.seatId);
      res.status(200).json({
        status: "success",
        message: "Seat released successfully"
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to release seat",
        error: error.message
      });
    }
});




module.exports = router;

