const express = require("express");
const wishlistController = require("../controller/WishListController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth');    



router.get("/wishlist", protect, checkRole("library-staff"),checkUserExists, wishlistController.getWishlist);
router.post("/wishlist/:bookid",protect, checkRole("student"),checkUserExists,wishlistController.addToWishlist);