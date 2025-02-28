const bookModel = require("../model/bookModel");
const asyncHandler = require("express-async-handler");
const userModel = require("../model/userModel")
const utils = require("../utils/utils")
const mongoose = require("mongoose");

// @desc    Create a new book (Only library-staff)
// @route   POST /api/books
// @access  Private (library-staff)

// Ensure correct path

const createBook = asyncHandler(async (req, res) => {
  try {
    const { name, category, author, photo } = req.body;

    // Ensure the logged-in user is library-staff
    if (res.locals.role !== "library-staff") { // ✅ Now using req.user.role
      return res.status(403).json({
        status: "failed",
        message: "Only library-staff can create a book",
      });
    }

    // Validate input fields
    if (!name || !category || !author || !photo) {
      return res.status(400).json({
        status: "failed",
        message: "All fields (name, category, author, photo) are required",
      });
    }

    // Ensure req.user exists and has an ID
    if (!res.locals.id) {
      return res.status(401).json({
        status: "failed",
        message: "User not authenticated",
      });
    }

    // Create the book
    const book = await bookModel.create({
      name,
      category,
      author,
      photo,
      managedBy:res.locals.id, // ✅ Now using req.user.id
    });

    res.status(201).json({
      status: "success",
      message: "Book created successfully",
      data: book,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error: error.message,
    });
  }
});

module.exports = createBook;


// @desc    Get all books (Only library-staff)
// @route   GET /api/books
// @access  Private (library-staff)
const getBooks = asyncHandler(async (req, res) => {
  // Fetch all books and populate the borrowedBy and managedBy fields
  const books = await bookModel.find().populate("borrowedBy managedBy");

  res.status(200).json({
    status: "success",
    results: books.length,
    data: books,
  });
});

// @desc    Update a book (Only library-staff)
// @route   PATCH /api/books/:id
// @access  Private (library-staff)
const updateBook = asyncHandler(async (req, res) => {
    const { name, category, author, photo, borrowedBy, borrowedDate, returnedDate } = req.body;
    const bookId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return res.status(400).json({
            status: "failed",
            message: "Invalid book ID format",
        });
    }

    // Find the book
    const book = await bookModel.findById(bookId);
    if (!book) {
        return res.status(404).json({ status: "failed", message: "Book not found" });
    }

    // Ensure the logged-in user is the library-staff managing the book
    if (book.managedBy.toString() !== res.locals.id.toString()) {
        return res.status(403).json({ status: "failed", message: "You are not authorized to update this book." });
    }

    // Update the book
    const updatedBook = await bookModel.findByIdAndUpdate(
        bookId,
        { name, category, author, photo, borrowedBy, borrowedDate, returnedDate },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        status: "success",
        message: "Book updated successfully",
        data: updatedBook,
    });
});
// @desc    Delete a book (Only library-staff)
// @route   DELETE /api/books/:id
// @access  Private (library-staff)
const deleteBook = asyncHandler(async (req, res) => {
    const bookId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return res.status(400).json({
            status: "failed",
            message: "Invalid book ID format",
        });
    }

    // Find the book
    const book = await bookModel.findById(bookId);
    if (!book) {
        return res.status(404).json({ status: "failed", message: "Book not found" });
    }

    // Ensure the logged-in user is the library-staff managing the book
    if (book.managedBy.toString() !== res.locals.id.toString()) {
        return res.status(403).json({ status: "failed", message: "You are not authorized to delete this book." });
    }

    await bookModel.findByIdAndDelete(bookId);

    res.status(200).json({
        status: "success",
        message: "Book deleted successfully",
    });
});



module.exports = {
  createBook,
  getBooks,
  updateBook,
  deleteBook,
};