const mongoose = require("mongoose"); // Ensure mongoose is imported
const asyncHandler = require("express-async-handler");
const BookRequest = require("../model/bookRequest");
const Book = require("../model/bookModel");
const User = require("../model/userModel"); // ✅ Import User Model

// @desc    Request a Book (Students Only)
// @route   POST /api/book-requests
// @access  Private (Students Only)
const requestBook = asyncHandler(async (req, res) => {
  const { bookId } = req.body;
  const studentId = res.locals.id; // Authenticated user ID

  // ✅ Validate book ID format
  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(400).json({ status: "failed", message: "Invalid book ID format" });
  }

  // ✅ Check if user exists and is a student
  const user = await User.findById(studentId);
  if (!user) {
    return res.status(404).json({ status: "failed", message: "User not found" });
  }
  if (user.role !== "student") {
    return res.status(403).json({ status: "failed", message: "Only students can request books" });
  }

  // ✅ Check if the book exists & is available
  const book = await Book.findById(bookId);
  if (!book) {
    return res.status(404).json({ status: "failed", message: "Book not found" });
  }
  if (book.borrowedBy) {
    return res.status(400).json({ status: "failed", message: "Book is already borrowed" });
  }

  // ✅ Check if the student already requested the book
  const existingRequest = await BookRequest.findOne({ student: studentId, book: bookId });
  if (existingRequest) {
    return res.status(400).json({ status: "failed", message: "You already requested this book" });
  }

  // ✅ Create a new book request
  const request = await BookRequest.create({ student: studentId, book: bookId });

  res.status(201).json({ status: "success", message: "Book request sent successfully", data: request });
});

// @desc    Approve or Reject a book request (Library Staff Only)
// @route   PATCH /api/book-requests/:requestId
// @access  Private (Library Staff)
// @desc    Get all book requests (Library Staff Only)
// @route   GET /api/book-requests
// @access  Private (Library Staff)
const getAllBookRequests = asyncHandler(async (req, res) => {
  try {
    const staffId = res.locals.id; // Authenticated library staff ID

    // ✅ Ensure the user is a library staff
    const staff = await User.findById(staffId);
    if (res.locals.role !== "library-staff") {
      return res.status(403).json({ status: "failed", message: "Access denied" });
    }

    // ✅ Fetch all book requests
    const requests = await BookRequest.find().populate("book student");
    
    res.status(200).json({ status: "success", data: requests });
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
});










const approveBookRequest = asyncHandler(async (req, res) => {
  try {
    const { action } = req.body; // action = "approve" or "reject"
    const { requestId } = req.params; // Get requestId from URL params
    const staffId = res.locals.id; // Authenticated library staff ID

    // ✅ Validate request ID format
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ status: "failed", message: "Invalid request ID format" });
    }

    // ✅ Check if staff exists and is library staff
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ status: "failed", message: "Library staff not found" });
    }
    if (staff.role !== "library-staff") {
      return res.status(403).json({ status: "failed", message: "Only library staff can approve/reject requests" });
    }

    // ✅ Find the book request
    const request = await BookRequest.findById(requestId).populate("book");
    if (!request) {
      return res.status(404).json({ status: "failed", message: "Request not found" });
    }

    if (action === "approve") {
      // ✅ Mark the book as borrowed
      await Book.findByIdAndUpdate(request.book._id, {
        borrowedBy: request.student,
        borrowedDate: new Date(),
      });

      // ✅ Update the request status
      request.status = "approved";
      request.approvedBy = staffId;
    } else if (action === "reject") {
      request.status = "rejected";
    }

    await request.save();
    res.status(200).json({ status: "success", message: `Request ${action}d successfully`, request });
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
});

module.exports = {
  requestBook,
  approveBookRequest,
  getAllBookRequests,
};
