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
    const { name, category, author, photo, totalCopies } = req.body;

    if (res.locals.role !== "library-staff") {
      return res.status(403).json({ status: "failed", message: "Only library-staff can create a book" });
    }

    if (!name || !category || !author || !photo || !totalCopies) {
      return res.status(400).json({ status: "failed", message: "All fields are required" });
    }

    if (totalCopies < 1) {
      return res.status(400).json({ status: "failed", message: "Total copies must be at least 1" });
    }

    const book = await bookModel.create({
      name,
      category,
      author,
      photo,
      totalCopies,
      availableCopies: totalCopies,
      managedBy: res.locals.id,
    });

    res.status(201).json({
      status: "success",
      message: "Book created successfully",
      data: book,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Something went wrong", error: error.message });
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


 //fetching the books in the mobile phone using the catgory 
const catgoryfetch = asyncHandler(async (req, res) => {
  const { category } = req.query; // Get category from request query

  let query = {}; // Default query object

  if (category) {
    query.category = category; // Filter books by category if provided
  }

  // Fetch books based on the query and populate relationships
  const books = await bookModel.find(query).populate("borrowedBy managedBy");

  res.status(200).json({
    status: "success",
    results: books.length,
    data: books,
  });
});


const namefetch = asyncHandler(async (req, res) => {
  const { name } = req.query; // Get search term from query

  let query = {}; // Default query object

  if (name) {
    // Case-insensitive regex for partial matches
    query.name = { 
      $regex: new RegExp(name, 'i') // 'i' flag = case-insensitive
    };
  }

  // Fetch books with regex filtering and populate relationships
  const books = await bookModel.find(query)
    .populate("borrowedBy managedBy");

  if (books.length === 0) {
    return res.status(404).json({
      status: "success",
      message: "No books found matching your criteria",
      results: 0,
      data: []
    });
  }

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
  const { name, category, author, photo, borrowedBy, borrowedDate, returnedDate, totalCopies } = req.body;
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

  // If totalCopies is provided, validate and update
  if (totalCopies !== undefined) {
      if (totalCopies < book.borrowedBy.length) {
          return res.status(400).json({
              status: "failed",
              message: "Total copies cannot be less than the number of borrowed copies",
          });
      }

      // Update the availableCopies based on the new totalCopies
      const availableCopies = totalCopies - book.borrowedBy.length;
      if (availableCopies < 0) {
          return res.status(400).json({
              status: "failed",
              message: "Not enough copies available for the given totalCopies",
          });
      }

      // Update the totalCopies and availableCopies
      book.totalCopies = totalCopies;
      book.availableCopies = availableCopies;
  }

  // Update other fields
  const updatedBook = await bookModel.findByIdAndUpdate(
      bookId,
      { name, category, author, photo, borrowedBy, borrowedDate, returnedDate, totalCopies: book.totalCopies, availableCopies: book.availableCopies },
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

  // Prevent deletion if there are borrowed copies
  if (book.borrowedBy.length > 0) {
      return res.status(400).json({
          status: "failed",
          message: "Cannot delete the book because there are borrowed copies.",
      });
  }

  // Delete the book
  await bookModel.findByIdAndDelete(bookId);

  res.status(200).json({
      status: "success",
      message: "Book deleted successfully",
  });
});


// @desc    Get total count of books
// @route   GET /api/books/count
// @access  Private (library-staff)
const getBooksCount = asyncHandler(async (req, res) => {
  try {
    const { category, available } = req.query;
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (available === 'true') {
      query.availableCopies = { $gt: 0 };
    } else if (available === 'false') {
      query.availableCopies = 0;
    }
    
    const count = await bookModel.countDocuments(query);
    
    res.status(200).json({
      status: "success",
      data: {
        count
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: "error", 
      message: "Something went wrong", 
      error: error.message 
    });
  }
});



// to count the book that is avalive in the librarys

const countBooks = asyncHandler(async (req, res) => {
  try {
    const totalBooks = await bookModel.countDocuments();

    res.status(200).json({
      status: "success",
      message: "Total number of books retrieved successfully",
      totalBooks,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to count books",
      error: error.message,
    });
  }
});



module.exports = {
  createBook,
  getBooks,
  updateBook,
  deleteBook,
  catgoryfetch,
  namefetch,
  getBooksCount,
  countBooks,
};
