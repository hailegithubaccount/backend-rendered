const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Wishlist = require("../model/wishlistModel");
const Book = require("../model/bookModel");

// ✅ Add a Book to Wishlist (Students Only)
const addToWishlist = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const studentId = res.locals.id;

    // ✅ Validate bookId format
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return res.status(400).json({ status: "failed", message: "Invalid book ID format" });
    }

    // ✅ Check if the book exists
    const book = await Book.findById(bookId);
    if (!book) {
        return res.status(404).json({ status: "failed", message: "Book not found" });
    }

    // ✅ Check if already in the wishlist
    const existingWishlist = await Wishlist.findOne({ student: studentId, book: bookId });
    if (existingWishlist) {
        return res.status(400).json({ status: "failed", message: "Book already in wishlist" });
    }

    // ✅ Add to wishlist
    await Wishlist.create({ student: studentId, book: bookId });

    res.status(201).json({ status: "success", message: "Book added to wishlist." });
});

// ✅ Get Wishlist for a Student
const getWishlist = asyncHandler(async (req, res) => {
    const studentId = res.locals.id;
    try {
        const studentId= res.locals.id; // Ensure this is set by your authentication middleware
        console.log(`Fetching wishlist for student ID: ${studentId}`);

        // Fetch the student's wishlist with populated details
        const wishlist = await Wishlist.find({ student: studentId  })
            .populate("student", "name email")
            .populate("book", "title author");

        if (!wishlist || wishlist.length === 0) {
            console.log(`No wishlist found for student ID: ${studentId}`);
            return res.status(404).json({ status: "error", message: "No wishlist found" });
        }

        console.log(`Wishlist retrieved successfully for student ID: $studentId }`);
        res.status(200).json({ status: "success", wishlist });
    } catch (err) {
        console.error('Error fetching wishlist:', err);
        res.status(500).json({ status: "error", message: "Internal Server Error", error: err.message });
    }
});




module.exports = {
    addToWishlist,
    getWishlist,
};
