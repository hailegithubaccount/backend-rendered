const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const BookRequest = require("../model/bookRequest");
const Book = require("../model/bookModel");
const User = require("../model/userModel");
const Wishlist = require("../model/wishlistModel");

// ✅ Request a Book (Students Only)
const requestBook = asyncHandler(async (req, res) => {
  const { bookId } = req.body;
  const studentId = res.locals.id;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(400).json({ status: "failed", message: "Invalid book ID format" });
  }

  const book = await Book.findOneAndUpdate(
    { _id: bookId, availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1 } },
    { new: true }
  );

  if (book) {
    const request = await BookRequest.create({
      student: studentId,
      book: bookId,
      status: "pending",
      takenAt: new Date(),
    });

    return res.status(200).json({
      status: "success",
      message: "Book assigned successfully.",
      request,
    });
  } else {
    const existingWishlist = await Wishlist.findOne({ student: studentId, book: bookId });
    if (!existingWishlist) {
      await Wishlist.create({ student: studentId, book: bookId });
    }

    return res.status(200).json({
      status: "waiting",
      message: "Book is currently unavailable. You have been added to the wishlist.",
    });
  }
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
  if (book.availableCopies < 0) {
    return res.status(400).json({ status: "failed", message: "No copies available" });
  }

  await Book.findByIdAndUpdate(book._id, { $inc: { availableCopies: -1 } });

  request.status = "taken";
  request.takenBy = staffId;
  request.takenAt = new Date();
  await request.save();

  res.status(200).json({ status: "success", message: "Book marked as taken successfully", request });
});

// ✅ Return a Book
const returnBook = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return res.status(400).json({ status: "failed", message: "Invalid request ID format" });
  }

  const request = await BookRequest.findById(requestId).populate("book");
  if (!request) {
    return res.status(404).json({ status: "failed", message: "Book request not found" });
  }

  if (request.status !== "taken" || !request.takenAt) {
    return res.status(400).json({ status: "failed", message: "This book was not borrowed" });
  }

  request.status = "returned";
  request.returnedAt = new Date();
  await request.save();

  const nextStudent = await Wishlist.findOne({ book: request.book.id }).sort("createdAt");

  if (nextStudent) {
    const newRequest = await BookRequest.create({
      student: nextStudent.student,
      book: request.book.id,
      status: "pending",
      requestedAt: new Date(),
    });

    await Wishlist.deleteOne({ _id: nextStudent._id });

    return res.status(200).json({
      status: "success",
      message: "Book returned and reserved for the next student in the wishlist.",
      request,
      newRequest,
    });
  }

  await Book.findByIdAndUpdate(request.book.id, { $inc: { availableCopies: 1 } });

  return res.status(200).json({
    status: "success",
    message: "Book successfully returned.",
    request,
  });
});

// ✅ Delete a Book Request (Library Staff)
const deleteBookRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const staffId = res.locals.id;

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return res.status(400).json({ status: "failed", message: "Invalid request ID format" });
  }

  const staff = await User.findById(staffId);
  if (!staff || staff.role !== "library-staff") {
    return res.status(403).json({ status: "failed", message: "Only library staff can delete requests" });
  }

  const request = await BookRequest.findById(requestId);
  if (!request) {
    return res.status(404).json({ status: "failed", message: "Book request not found" });
  }

  if (request.status === "taken") {
    return res.status(400).json({ status: "failed", message: "Cannot delete a request that has already been taken" });
  }

  await BookRequest.findByIdAndDelete(requestId);

  res.status(200).json({ status: "success", message: "Book request deleted successfully" });
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
  deleteBookRequest, // ✅ New delete function added
  getAllBookRequests,
};
