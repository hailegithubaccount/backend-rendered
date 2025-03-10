const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const BookRequest = require("../model/bookRequest");
const Book = require("../model/bookModel");
const User = require("../model/userModel");

// ✅ Request a Book (Students Only)
const requestBook = asyncHandler(async (req, res) => {
  const { bookId } = req.body;
  const studentId = res.locals.id;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(400).json({ status: "failed", message: "Invalid book ID format" });
  }

  const user = await User.findById(studentId);
  if (!user || user.role !== "student") {
    return res.status(403).json({ status: "failed", message: "Only students can request books" });
  }

  const book = await Book.findById(bookId);
  if (!book) {
    return res.status(404).json({ status: "failed", message: "Book not found" });
  }
  if (book.availableCopies <= 0) {
    return res.status(400).json({ status: "failed", message: "No copies available" });
  }

  const existingRequest = await BookRequest.findOne({ student: studentId, book: bookId, status: "pending" });
  if (existingRequest) {
    return res.status(400).json({ status: "failed", message: "You already requested this book" });
  }

  await BookRequest.create({ student: studentId, book: bookId });
  res.status(201).json({ status: "success", message: "Book request sent successfully" });
});

// ✅ Approve Book Request (Library Staff)
const approveBookRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const staffId = res.locals.id;

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return res.status(400).json({ status: "failed", message: "Invalid request ID format" });
  }

  const staff = await User.findById(staffId);
  if (!staff || staff.role !== "library-staff") {
    return res.status(403).json({ status: "failed", message: "Only library staff can approve requests" });
  }

  const request = await BookRequest.findById(requestId).populate("book");
  if (!request || request.status !== "pending") {
    return res.status(404).json({ status: "failed", message: "Invalid or already processed request" });
  }

  const book = request.book;
  if (book.availableCopies <= 0) {
    return res.status(400).json({ status: "failed", message: "No copies available" });
  }

  // ✅ Mark book as taken & decrease available copies
  await Book.findByIdAndUpdate(book._id, { $inc: { availableCopies: -1 } });

  request.status = "taken";
  request.takenBy = staffId;
  request.takenAt = new Date();
  await request.save();

  res.status(200).json({ status: "success", message: "Book marked as taken successfully", request });
});

const returnBook = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return res.status(400).json({ status: "failed", message: "Invalid request ID format" });
  }

  const request = await BookRequest.findById(requestId).populate("book");

  if (!request) {
    return res.status(404).json({ status: "failed", message: "Request not found" });
  }

  if (request.status !== "taken" || !request.takenAt) {
    return res.status(400).json({ status: "failed", message: "Invalid return request" });
  }

  console.log("Library staff confirming return for:", request.book.title);

  // ✅ Increase available copies
  await Book.findByIdAndUpdate(request.book.id, { $inc: { availableCopies: 1 } });

  // ✅ Mark as returned
  request.status = "returned";
  request.returnedAt = new Date();
  await request.save();

  res.status(200).json({
    status: "success",
    message: `Book '${request.book.title}' returned successfully and is now available`,
    request
  });
});


// ✅ Get All Book Requests (Library Staff)
const getAllBookRequests = asyncHandler(async (req, res) => {
  const staffId = res.locals.id;
  const staff = await User.findById(staffId);

  if (!staff || staff.role !== "library-staff") {
    return res.status(403).json({ status: "failed", message: "Access denied" });
  }

  const requests = await BookRequest.find().populate("book student");
  res.status(200).json({ status: "success", data: requests });
});

module.exports = {
  requestBook,
  approveBookRequest,
  returnBook,
  getAllBookRequests,
};
 