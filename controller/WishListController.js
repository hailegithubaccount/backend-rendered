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
const mongoose = require("mongoose");

// ✅ Get Wishlist for a Student
const getWishlist = asyncHandler(async (req, res) => {
    const studentId = res.locals.id;

    // Validate and convert studentId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ status: "failed", message: "Invalid student ID format" });
    }

    const objectIdStudentId = new mongoose.Types.ObjectId(studentId);

    try {
        // Debugging: Log the query
        console.log("Querying Wishlist with studentId:", objectIdStudentId);

        // Fetch wishlist with book details
        const wishlist = await Wishlist.find({ student: objectIdStudentId })
            .populate("book")
            .populate("student");

        // Debugging: Log raw data
        console.log("Raw Wishlist Data:", wishlist);

        if (!wishlist || wishlist.length === 0) {
            return res.status(404).json({ status: "failed", message: "Wishlist is empty" });
        }

        res.status(200).json({ status: "success", wishlist });
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).json({ status: "failed", message: "Server error" });
    }
});



module.exports = {
    addToWishlist,
    getWishlist,
};
