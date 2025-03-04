const express = require("express");
const RequestController = require("../controller/RequestController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth');  // Ensure authentication

const router = express.Router();

router.post("/request",protect,checkRole("student"), checkUserExists,RequestController.requestBook);
router.get("/request",protect,checkRole("library-staff"), checkUserExists,RequestController. getAllBookRequests); // // Auth required
router.patch("/approved/:requestId", protect, checkRole("library-staff"), checkUserExists, RequestController.approveBookRequest);

module.exports = router;
