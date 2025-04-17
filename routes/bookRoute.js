const express = require("express");
const router = express.Router();
const bookController = require("../controller/bookController");
const { protect,checkRole, checkUserExists} = require('../middleware/auth'); // Ensure these are imported correctly

// Protect all routes with the protect, checkRole('library-staff'), and checkUserExists middleware
// router.use(protect, checkRole("library-staff"), checkUserExists);

// Create a new book
router.post("/insert",protect,checkRole("library-staff"), checkUserExists, bookController.createBook);

// Get all books
router.get("/read",bookController.getBooks);


router.get("/read/catgoryfetch",bookController.catgoryfetch);

router.get("/read/namefetch",bookController.namefetch);
router.get("/read/count",bookController.getBooksCount);


// Update a book
router.patch("/update:id",protect,checkRole("library-staff"), checkUserExists, bookController.updateBook);

// Delete a book
router.delete("/delete:id",protect,checkRole("library-staff"), checkUserExists, bookController.deleteBook);

module.exports = router;