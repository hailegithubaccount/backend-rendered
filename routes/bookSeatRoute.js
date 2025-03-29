const express = require("express");
const router = express.Router();
const { protect,checkRole, checkUserExists} = require('../middleware/auth');
const bookController =require('../controller/BookSeatController');



router.get("/read",protect,checkRole("library-staff"), checkUserExists,bookController.getBookSeats);


module.exports = router;