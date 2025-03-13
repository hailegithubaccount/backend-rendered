const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Wishlist = require("../model/wishlistModel");
const Book = require("../model/bookModel");

// ✅ Add a Book to Wishlist (Students Only)
const addToWishlist = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const studentId = res.locals.id;

    // Validate that both IDs are valid ObjectIds
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ status: "failed", message: "Invalid student ID format" });
    }
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return res.status(400).json({ status: "failed", message: "Invalid book ID format" });
    }

    // Convert IDs to ObjectId
    const objectIdStudentId = new mongoose.Types.ObjectId(studentId);
    const objectIdBookId = new mongoose.Types.ObjectId(bookId);

    // Check if the book exists
    const book = await Book.findById(objectIdBookId);
    if (!book) {
        return res.status(404).json({ status: "failed", message: "Book not found" });
    }

    // Check if the book is already in the wishlist
    const existingWishlist = await Wishlist.findOne({
        student: objectIdStudentId,
        book: objectIdBookId,
    });
    if (existingWishlist) {
        return res.status(400).json({ status: "failed", message: "Book already in wishlist" });
    }

    // Add the book to the wishlist
    await Wishlist.create({ student: objectIdStudentId, book: objectIdBookId });

    res.status(201).json({ status: "success", message: "Book added to wishlist." });
});

// ✅ Get Wishlist for a Student
const getWishlist = asyncHandler(async (req, res) => {
    const studentId = res.locals.id;

   // Validate that the studentId is a valid ObjectId
if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ status: "failed", message: "Invalid student ID format" });
}

// Convert studentId to ObjectId
const objectIdStudentId = new mongoose.Types.ObjectId(studentId);
console.log("Converted Student ID (ObjectId):", objectIdStudentId);

    try {
        // Fetch wishlist with book details using populate
        const rawWishlist = await Wishlist.find({ student: objectIdStudentId }).lean();
        console.log("Raw Wishlist Data (without populate):", rawWishlist);
        
        if (!rawWishlist || rawWishlist.length === 0) {
            return res.status(200).json({
                status: "success",
                message: "Wishlist is currently empty.",
                wishlist: [],
            });
        }
        
        res.status(200).json({ status: "success", wishlist: rawWishlist });

        // Return the wishlist data
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