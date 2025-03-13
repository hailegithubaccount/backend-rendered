const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const BookRequest = require("../model/bookRequest");
const Book = require("../model/bookModel");
const User = require("../model/userModel");

// ✅ Request a Book (Students Only)


const Wishlist = require("../model/wishlistModel");


const requestBook = asyncHandler(async (req, res) => {
  const { bookId } = req.body;
  const studentId = res.locals.id;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(400).json({ status: "failed", message: "Invalid book ID format" });
  }

  // ✅ Check if the book exists and update atomically
  const book = await Book.findOneAndUpdate(
    { _id: bookId, availableCopies: { $gt: 0 } }, // Ensure book is available
    { $inc: { availableCopies: -1 } }, // Decrease available copies
    { new: true } // Return the updated document
  );

  if (book) {
    // ✅ Book is available → Assign it to the student
    const request = await BookRequest.create({
      student: studentId,
      book: bookId,
      status: "taken",
      takenAt: new Date(),
    });

    return res.status(200).json({
      status: "success",
      message: "Book assigned successfully.",
      request,
    });
  } else {
    // ❌ Book NOT available → Add to Wishlist
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
  const studentId = res.locals.id;

  // 🛑 Validate request ID
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return res.status(400).json({ status: "failed", message: "Invalid request ID format" });
  }

  // 🔍 Fetch the book request with book details
  const request = await BookRequest.findById(requestId).populate("book");
  if (!request) {
    return res.status(404).json({ status: "failed", message: "Request not found" });
  }

  // 🚫 Ensure the book is currently borrowed
  if (request.status !== "taken" || !request.takenAt) {
    return res.status(400).json({ status: "failed", message: "This book was not borrowed" });
  }

  // 🛑 Check if the correct student is returning the book
  if (request.student.toString() !== studentId) {
    return res.status(403).json({ status: "failed", message: "You can't return this book" });
  }

  // ✅ Increase the available book copies
  await Book.findByIdAndUpdate(request.book.id, { $inc: { availableCopies: 1 } });

  // 📌 Update request status to 'returned'
  request.status = "returned";
  request.returnedAt = new Date();
  await request.save();

  // 🔍 Find the next student in the wishlist
  const nextStudent = await Wishlist.findOne({ book: request.book.id }).sort("createdAt");

  if (nextStudent) {
    // 🔄 Assign book to next student
    const newRequest = await BookRequest.create({
      student: nextStudent.student,
      book: request.book.id,
      status: "taken",
      takenAt: new Date(),
    });

    // ❌ Remove student from Wishlist
    await Wishlist.deleteOne({ _id: nextStudent._id });

    return res.status(200).json({
      status: "success",
      message: "Book returned and assigned to the next student in the wishlist.",
      request,
      newRequest, // 📌 Added so the frontend knows about the new request
    });
  }

  // ✅ If no one is waiting, simply return success
  res.status(200).json({
    status: "success",
    message: "Book returned successfully",
    request,
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
 