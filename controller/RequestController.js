const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const BookRequest = require("../model/bookRequest");
const Book = require("../model/bookModel");
const User = require("../model/userModel");
const Wishlist = require("../model/wishlistModel");

// ✅ Request a Book (Students Only)
const requestBook = asyncHandler(async (req, res) => {
  const { bookId, addToWishlist } = req.body; // Accept `addToWishlist` from the request
  const studentId = res.locals.id;

  // Validate the book ID format
  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(400).json({ status: "failed", message: "Invalid book ID format" });
  }

  // Check if the book exists and has available copies
  const book = await Book.findById(bookId);
  if (!book) {
    return res.status(404).json({ status: "failed", message: "Book not found" });
  }

  if (book.availableCopies > 0) {
    // Create a pending request for the book
    const request = await BookRequest.create({
      student: studentId,
      book: bookId,
      status: "pending",
      takenAt: null,
    });

    return res.status(200).json({
      status: "success",
      message: "Book request submitted successfully. Awaiting approval.",
      request,
    });
  } else {
    // Book is unavailable
    if (addToWishlist) {
      // Only add to wishlist if the student explicitly requests
      const existingWishlist = await Wishlist.findOne({ student: studentId, book: bookId });
      if (!existingWishlist) {
        await Wishlist.create({ student: studentId, book: bookId });
      }

      return res.status(200).json({
        status: "waiting",
        message: "Book is currently unavailable. You have been added to the wishlist.",
      });
    }

    // Ask the student whether they want to join the wishlist
    return res.status(200).json({
      status: "unavailable",
      message: "Book is currently unavailable. Would you like to be added to the wishlist?",
    });
  }
});


// ✅ Approve Book Request (Library Staff)
const approveBookRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const staffId = res.locals.id;

  // Validate request ID
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return res.status(400).json({ status: "failed", message: "Invalid request ID format" });
  }

  // Check if the user is authorized (library staff)
  const staff = await User.findById(staffId);
  if (!staff || staff.role !== "library-staff") {
    return res.status(403).json({ status: "failed", message: "Only library staff can approve requests" });
  }

  // Fetch the request and populate the associated book
  const request = await BookRequest.findById(requestId).populate("book");
  if (!request || request.status !== "pending") {
    return res.status(404).json({ status: "failed", message: "Invalid or already processed request" });
  }

  const book = request.book;

  // Ensure the book has available copies before approving
  if (book.availableCopies <= 0) {
    return res.status(400).json({ status: "failed", message: "No copies available" });
  }

  // Decrement available copies
  const updatedBook = await Book.findByIdAndUpdate(
    book._id,
    { $inc: { availableCopies: -1 } }, // ✅ Decrement available copies
    { new: true }
  );

  if (!updatedBook) {
    return res.status(500).json({ status: "failed", message: "Failed to update book availability" });
  }

  // Update the request status to 'taken'
  request.status = "taken";
  request.takenBy = staffId;
  request.takenAt = new Date();
  await request.save();

  res.status(200).json({
    status: "success",
    message: "Book marked as taken successfully",
    request,
  });
});
// ✅ Return a Book
const returnBook = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  // Validate request ID
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return res.status(400).json({ status: "failed", message: "Invalid request ID format" });
  }

  // Fetch the request and populate the associated book
  const request = await BookRequest.findById(requestId).populate("book");
  if (!request) {
    return res.status(404).json({ status: "failed", message: "Book request not found" });
  }

  // Ensure the book was borrowed
  if (request.status !== "taken" || !request.takenAt) {
    return res.status(400).json({ status: "failed", message: "This book was not borrowed" });
  }

  // Increment available copies
  await Book.findByIdAndUpdate(
    request.book.id,
    { $inc: { availableCopies: 1 } }, // ✅ Increment available copies
    { new: true }
  );

  // Mark the request as returned
  request.status = "returned";
  request.returnedAt = new Date();
  await request.save();

  // Check the wishlist for the next student
  let nextWishlistEntry = await Wishlist.findOne({ book: request.book.id })
    .sort("createdAt")
    .populate("student book");

  if (nextWishlistEntry) {
    // Ensure full student details are fetched
    nextWishlistEntry = await Wishlist.findById(nextWishlistEntry._id).populate({
      path: "student",
      select: "name email", // Only get required fields
    });

    // Create a new pending request for the next student
    const newRequest = await BookRequest.create({
      student: nextWishlistEntry.student._id,
      book: nextWishlistEntry.book._id,
      status: "pending",
      takenAt: null, // Not taken yet
    });

    // Remove the student from the wishlist
    await Wishlist.findByIdAndDelete(nextWishlistEntry._id);

    return res.status(200).json({
      status: "success",
      message: "Book returned. A new request has been created for the next student on the wishlist.",
      request,
      nextStudentRequest: {
        _id: newRequest._id,
        student: {
          _id: nextWishlistEntry.student._id,
          name: nextWishlistEntry.student.name || "Unknown", // ✅ Fix missing name
          email: nextWishlistEntry.student.email || "No Email", // ✅ Fix missing email
        },
        book: {
          _id: nextWishlistEntry.book._id,
          name: nextWishlistEntry.book.name,
          category: nextWishlistEntry.book.category,
          author: nextWishlistEntry.book.author,
          photo: nextWishlistEntry.book.photo,
          totalCopies: nextWishlistEntry.book.totalCopies,
          availableCopies: nextWishlistEntry.book.availableCopies,
        },
        status: "pending",
        createdAt: newRequest.createdAt,
        updatedAt: newRequest.updatedAt,
      },
    });
  }

  res.status(200).json({
    status: "success",

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
