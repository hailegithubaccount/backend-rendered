const express = require("express");
const router = express.Router();
const { protect,checkRole, checkUserExists} = require('../middleware/auth');
const bookController =require('../controller/BookSeatController');



router.get("/read",protect,checkRole("library-staff"), checkUserExists,bookController.getBookSeats);
router.get("/allreservedbook",protect,checkRole("library-staff"), checkUserExists,bookController.getAllReservedBookSeats);
router.get("/allreservedbook/count",protect,checkRole("library-staff"), checkUserExists,bookController.countReservedBookSeats);
router.put('/releaseBystaff/:id',protect,checkRole("library-staff"), checkUserExists,bookController.releaseBookSeatByStaff);


module.exports = router;