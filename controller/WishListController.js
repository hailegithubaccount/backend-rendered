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




const getStudentWishlist = asyncHandler(async (req, res) => {
    const studentId = res.locals.id; // From auth middleware

    // Validate student ID
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ status: "failed", message: "Invalid student ID format" });
    }

    const objectIdStudentId = new mongoose.Types.ObjectId(studentId);

    // Fetch wishlist with book details (populate)
    const wishlist = await Wishlist.find({ student: objectIdStudentId })
        .populate('book', 'title author photo available name'); // Customize fields as needed

    res.status(200).json({ 
        status: "success", 
        data: wishlist 
    });
});








































const getWishlist = async (req, res) => {
    try {
        const { search, field = 'book.title' } = req.query; // Default: search by book title

        // Build the query dynamically
        let query = {};
        if (search) {
            query[field] = { 
                $regex: new RegExp(search, 'i') // Case-insensitive regex
            };
        }

        const wishlistItems = await Wishlist.find(query)
            .populate("student", 'name email')  // Only include student name/email
            .populate("book", 'title author coverImage'); // Only include book details

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
    const { id } = req.params;
    const studentId = req.user?._id || res.locals.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            status: "failed",
            message: "Invalid wishlist ID format"
        });
    }

    const deletedItem = await Wishlist.findOneAndDelete({
        _id: id,
        student: studentId
    });

    if (!deletedItem) {
        return res.status(404).json({
            status: "failed",
            message: "Wishlist item not found"
        });
    }

    res.status(200).json({
        status: "success",
        data: deletedItem
    });
});





const getWishlistByStudent = asyncHandler(async (req, res) => {
    const studentId = res.locals.id; // Authenticated student's ID

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ 
            status: "failed", 
            message: "Invalid student ID format" 
        });
    }

    try {
        // Ensure filtering by studentId only
        const wishlistItems = await Wishlist.find({ student: studentId }) 
            .populate({
                path: "book",
                select: "title author", // Only fetch required fields
            });

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
    getWishlistByStudent, 
    getStudentWishlist // Added this line
};