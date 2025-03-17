const express = require("express");
const router = express.Router();
const wishlistController = require("../controller/WishListController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth');    



router.get("/wishlist", protect, wishlistController.getWishlist);
router.post("/wishlist/:bookId", protect, checkRole("student"), checkUserExists, wishlistController.addToWishlist);

router.delete("/wishlist/:wishlistId", protect, checkRole("student"), checkUserExists, wishlistController.deleteFromWishlist);
router.get("/wishlist", protect, checkRole("student"), checkUserExists, wishlistController.getWishlistBystudent);



module.exports = router;