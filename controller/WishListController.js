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
const getWishlist = async (req, res) => {
    try {
        const wishlistItems = await Wishlist.find().populate("student").populate("book");

        if (!wishlistItems.length) {
            return res.status(404).json({
                status: "failed",
                message: "No wishlist items found",
            });
        }

        res.status(200).json({
            status: "success",
            message: "Wishlist fetched successfully",
            data: wishlistItems,
        });
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).json({
            status: "failed",
            message: "Server error, unable to fetch wishlist",
        });
    }
};

// ✅ Delete a Book from Wishlist
const deleteFromWishlist = asyncHandler(async (req, res) => {
    const { wishlistId } = req.params;
    const studentId = res.locals.id; // Get the authenticated student's ID

    // Validate wishlistId format
    if (!mongoose.Types.ObjectId.isValid(wishlistId)) {
        return res.status(400).json({ status: "failed", message: "Invalid wishlist ID format" });
    }

    // Find the wishlist item by ID
    const wishlistItem = await Wishlist.findById(wishlistId);

    // Check if the wishlist item exists
    if (!wishlistItem) {
        return res.status(404).json({ status: "failed", message: "Wishlist item not found" });
    }

    // Ensure the wishlist item belongs to the authenticated student
    if (wishlistItem.student.toString() !== studentId) {
        return res.status(403).json({ 
            status: "failed", 
            message: "You are not authorized to delete this wishlist item" 
        });
    }

    // Delete the wishlist item
    await Wishlist.findByIdAndDelete(wishlistId);

    res.status(200).json({ status: "success", message: "Wishlist item deleted successfully" });
});

const getWishlistBystudent = asyncHandler(async (req, res) => {
    const studentId = res.locals.id; // Get the authenticated student's ID

    // Validate studentId format
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ status: "failed", message: "Invalid student ID format" });
    }

    try {
        // Fetch wishlist items for the authenticated student
        const wishlistItems = await Wishlist.find({ student: studentId })
            .populate("student")
            .populate("book");

        if (!wishlistItems.length) {
            return res.status(404).json({
                status: "failed",
                message: "No wishlist items found for this student",
            });
        }

        res.status(200).json({
            status: "success",
            message: "Wishlist fetched successfully",
            data: wishlistItems,
        });
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).json({
            status: "failed",
            message: "Server error, unable to fetch wishlist",
        });
    }
});





// Export all functions
module.exports = {
    addToWishlist,
    getWishlist,
    deleteFromWishlist,
    getWishlistBystudent, // Added this line
};