const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const BookRequest = require("../model/bookRequest");
const Book = require("../model/bookModel");
const User = require("../model/userModel");
const Seat = require("../model/seatModel");
const Wishlist = require("../model/wishlistModel");
const NotifcactionForseat = require("../model/notifactionForSeat");
const { Expo } = require('expo-server-sdk');

const Notification = require("../model/Notification"); 
// ✅ Request a Book (Students Only)
const requestBook = asyncHandler(async (req, res) => {
  const { bookId, addToWishlist } = req.body; // Accept `addToWishlist` from the request
  const studentId = res.locals.id;

  // Validate the book ID format
  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(400).json({ status: "failed", message: "Invalid book ID format" });
  }

  // Check if the book exists
  const book = await Book.findById(bookId);
  if (!book) {
    return res.status(404).json({ status: "failed", message: "Book not found" });
  }

  // Check if the student already has a pending request for this book
  const existingRequest = await BookRequest.findOne({
    student: studentId,
    book: bookId,
    status: "pending",
  });

  if (existingRequest) {
    return res.status(400).json({
      status: "failed",
      message: "You already have a pending request for this book.",
    });
  }

  if (book.availableCopies > 0) {
    // Create a pending request for the book
    const request = await BookRequest.create({
      student: studentId,
      book: bookId,
      status: "pending", // Initial status is always "pending"
      takenAt: null, // No book has been taken yet
    });

    return res.status(200).json({
      status: "success",
      message: "Book request submitted successfully. Awaiting approval.",
      data: request,
    });
  } else {
    // Book is unavailable
    if (addToWishlist === true) {
      // Add the student to the wishlist if they explicitly requested
      const existingWishlist = await Wishlist.findOne({ student: studentId, book: bookId });
      if (!existingWishlist) {
        await Wishlist.create({ student: studentId, book: bookId });
      }

      return res.status(200).json({
        status: "waiting",
        message: "Book is currently unavailable. You have been added to the wishlist.",
      });
    } else if (addToWishlist === false) {
      // Student does not want to join the wishlist
      return res.status(200).json({
        status: "unavailable",
        message: "Book is currently unavailable. You chose not to join the wishlist.",
      });
    } else {
      // Prompt the student to decide whether to join the wishlist
      return res.status(200).json({
        status: "unavailable",
        message: "Book is currently unavailable. Would you like to be added to the wishlist?",
      });
    }
  }
});

// ✅ Approve Book Request (Library Staff)



// ✅ Approve Book Request (Library Staff)


// const approveBookRequest = asyncHandler(async (req, res) => {
//   const { requestId } = req.params;
//   const staffId = res.locals.id; // Extract staff ID from the token

//   // Validate request ID
//   if (!mongoose.Types.ObjectId.isValid(requestId)) {
//     return res.status(400).json({ status: "failed", message: "Invalid request ID format" });
//   }

//   // Check if the user is authorized (library-staff)
//   const staff = await User.findById(staffId);
//   if (!staff || staff.role !== "library-staff") {
//     return res.status(403).json({ status: "failed", message: "Only library staff can approve requests" });
//   }

//   // Fetch the request and populate the associated book
//   const request = await BookRequest.findById(requestId).populate("book");
//   if (!request) {
//     return res.status(404).json({ status: "failed", message: "Book request not found" });
//   }

//   if (request.status !== "pending") {
//     return res.status(400).json({
//       status: "failed",
//       message: `This request has already been processed. Current status: ${request.status}`,
//     });
//   }

//   const book = request.book;

//   // Ensure the book has available copies before approving
//   if (book.availableCopies <= 0) {
//     return res.status(400).json({ status: "failed", message: "No copies available" });
//   }

//   // Decrement available copies
//   const updatedBook = await Book.findByIdAndUpdate(
//     book._id,
//     { $inc: { availableCopies: -1 } }, // Decrement available copies
//     { new: true }
//   );

//   if (!updatedBook) {
//     return res.status(500).json({ status: "failed", message: "Failed to update book availability" });
//   }

//   // Find an available seat of type "book"
//   const availableSeat = await Seat.findOne({ type: "book", isAvailable: true }).sort({ seatNumber: 1 });
//   if (!availableSeat) {
//     return res.status(400).json({ status: "failed", message: "No book-related seats available" });
//   }

//   // Assign the seat to the student
//   availableSeat.isAvailable = false;
//   availableSeat.reservedBy = request.student; // Link to the student
//   availableSeat.reservedAt = new Date();
//   await availableSeat.save();

//   // Update the request status to 'taken' and assign the seat
//   request.status = "taken";
//   request.takenBy = staffId;
//   request.takenAt = new Date();
//   request.seat = availableSeat.seatNumber; // Assign the seat number
//   await request.save();

//   // Create a notification for the student
//   await NotifcactionForseat.create({
//     user: request.student, // The student who made the request
//     book: book.id, // ✅ Use `id` instead of `_id`
//     seat: availableSeat.seatNumber, // Include the assigned seat
//     message: `Your book "${book.name}" has been approved. Assigned seat: ${availableSeat.seatNumber}. Please collect your book within 2 hours.`,
//   });
  

//   res.status(200).json({
//     status: "success",
//     message: `Book marked as taken successfully. Assigned seat: ${availableSeat.seatNumber}`,
//     request,
//   });
// });



const approveBookRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const staffId = res.locals.id;

  // Validate request ID
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return res.status(400).json({ status: "failed", message: "Invalid request ID format" });
  }

  // Check if the user is authorized (library-staff)
  const staff = await User.findById(staffId);
  if (!staff || staff.role !== "library-staff") {
    return res.status(403).json({ status: "failed", message: "Only library staff can approve requests" });
  }

  // Fetch the request and populate the associated book
  const request = await BookRequest.findById(requestId).populate("book");
  if (!request) {
    return res.status(404).json({ status: "failed", message: "Book request not found" });
  }

  if (request.status !== "pending") {
    return res.status(400).json({
      status: "failed",
      message: `This request has already been processed. Current status: ${request.status}`,
    });
  }

  const book = request.book;

  // Ensure the book has available copies before approving
  if (book.availableCopies <= 0) {
    return res.status(400).json({ status: "failed", message: "No copies available" });
  }

  // Decrement available copies
  const updatedBook = await Book.findByIdAndUpdate(
    book._id,
    { $inc: { availableCopies: -1 } }, // Decrement available copies
    { new: true }
  );

  if (!updatedBook) {
    return res.status(500).json({ status: "failed", message: "Failed to update book availability" });
  }

  // Find an available seat of type "book"
  const availableSeat = await Seat.findOne({ type: "book", isAvailable: true }).sort({ seatNumber: 1 });
  if (!availableSeat) {
    return res.status(400).json({ status: "failed", message: "No book-related seats available" });
  }

  // Assign the seat to the student
  availableSeat.isAvailable = false;
  availableSeat.reservedBy = request.student;
  availableSeat.reservedAt = new Date();
  await availableSeat.save();

  // Update the request status to 'taken' and assign the seat
  request.status = "taken";
  request.takenBy = staffId;
  request.takenAt = new Date();
  request.seat = availableSeat.seatNumber;
  await request.save();

  // Create a notification for the student
  const notification = await NotifcactionForseat.create({
    user: request.student,
    book: book.id,
    message: `Your book "${book.name}" has been approved. Assigned seat: ${availableSeat.seatNumber}. Please collect your book within 2 hours.`,
  });

  // Get the student's Expo push token
  const student = await User.findById(request.student);
  const pushToken = student.pushToken;

  // Send the push notification to the student
  if (pushToken && Expo.isExpoPushToken(pushToken)) {
    const message = {
      to: pushToken,
      sound: 'default',
      title: 'Book Reservation Approved',
      body: `Your book "${book.name}" has been approved. Assigned seat: ${availableSeat.seatNumber}.`,
      data: { seat: availableSeat.seatNumber, bookId: book.id },
    };

    try {
      const ticket = await expo.sendPushNotificationsAsync([message]);
      console.log('Notification sent successfully:', ticket);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  res.status(200).json({
    status: "success",
    message: `Book marked as taken successfully. Assigned seat: ${availableSeat.seatNumber}`,
    request,
  });
});


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
    { $inc: { availableCopies: 1 } }, // Increment available copies
    { new: true }
  );

  // Release the seat
  if (request.seat) {
    const seat = await Seat.findOne({ seatNumber: request.seat });
    if (seat) {
      seat.isAvailable = true;
      seat.reservedBy = null;
      seat.releasedAt = new Date();
      await seat.save();
    }
  }

  // Mark the request as returned
  request.status = "returned";
  request.returnedAt = new Date();
  await request.save();

  // Check the wishlist for the next student
  let nextWishlistEntry = await Wishlist.findOne({ book: request.book.id })
    .sort("createdAt")
    .populate("student book");

  if (nextWishlistEntry) {
    // Find an available seat of type "book"
    const availableSeat = await Seat.findOne({ type: "book", isAvailable: true }).sort({ seatNumber: 1 });
    if (!availableSeat) {
      return res.status(400).json({
        status: "failed",
        message: "No book-related seats available for the next student on the wishlist.",
      });
    }

    // Assign the seat to the next student
    availableSeat.isAvailable = false;
    availableSeat.reservedBy = nextWishlistEntry.student._id;
    availableSeat.reservedAt = new Date();
    await availableSeat.save();

    // Create a new pending request for the next student
    const newRequest = await BookRequest.create({
      student: nextWishlistEntry.student._id,
      book: nextWishlistEntry.book._id,
      status: "pending",
      takenAt: null, // Not taken yet
      seat: availableSeat.seatNumber, // Assign the seat number
    });

    // Remove the student from the wishlist
    await Wishlist.findByIdAndDelete(nextWishlistEntry._id);

    // Create a notification for the next student
    await Notification.create({
      user: nextWishlistEntry.student._id, // The student who needs the book
      book: nextWishlistEntry.book._id, // Reference to the book (optional)
      message: `The book "${nextWishlistEntry.book.name}" is now available. Please visit the library to collect it. Assigned seat: ${availableSeat.seatNumber}`,
    });

    return res.status(200).json({
      status: "success",
      message: "Book returned. A new request has been created for the next student on the wishlist.",
      request,
      nextStudentRequest: {
        _id: newRequest._id,
        student: {
          _id: nextWishlistEntry.student._id,
          name: nextWishlistEntry.student.name || "Unknown", // Fix missing name
          email: nextWishlistEntry.student.email || "No Email", // Fix missing email
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
        seat: availableSeat.seatNumber, // Include the assigned seat in the response
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
