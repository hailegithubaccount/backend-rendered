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


const approveBookRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const staffId = res.locals.id; // Extract staff ID from the token

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
  availableSeat.reservedBy = request.student; // Link to the student
  availableSeat.reservedAt = new Date();
  await availableSeat.save();

  const returnDeadline = new Date(Date.now() + 2 * 60 * 1000); 
  // Update the request status to 'taken' and assign the seat
  request.status = "taken";
  request.takenBy = staffId;
  request.takenAt = new Date();
  request.seat = availableSeat.seatNumber;
  request.returnDeadline = returnDeadline; // Set the deadline
  await request.save();

  // Create a notification for the student
  await NotifcactionForseat.create({
    user: request.student,
    book: book._id,
    seat: availableSeat.seatNumber,
    message: `Your book "${book.name}" has been assigned to seat ${availableSeat.seatNumber}. Please return by ${returnDeadline.toLocaleTimeString()}.`,
    type: 'seat_assigned',
    deadline: returnDeadline
  });
  
  setTimeout(async () => {
    const currentRequest = await BookRequest.findById(requestId);
    if (currentRequest?.status === 'taken') {
      await NotifcactionForseat.create({
        user: request.student,
        book: book._id,
        seat: availableSeat.seatNumber,
        message: `REMINDER: Please return "${book.name}" from seat ${availableSeat.seatNumber} soon.`,
        type: 'return_reminder'
      });
    }
  }, 1 * 60 * 1000);

  setTimeout(async () => {
    const currentRequest = await BookRequest.findById(requestId);
    if (currentRequest?.status === 'taken') {
      await NotifcactionForseat.create({
        user: request.student,
        book: book._id,
        seat: availableSeat.seatNumber,
        message: `OVERDUE: Please return "${book.name}" from seat ${availableSeat.seatNumber} immediately!`,
        type: 'return_overdue'
      });
      
      // Also notify staff
      await NotifcactionForseat.create({
        user: staffId, // Ensure this is a valid user ID
        book: book._id, // Ensure this is a valid book ID
        seat: availableSeat.seatNumber, // Ensure this is a valid seat number
        message: `Student ${request.student.name} has overdue book "${book.name}" at seat ${availableSeat.seatNumber}`,
        type: 'return_overdue'
      });
    }
  }, 2 * 60 * 1000);

  res.status(200).json({
    status: "success",
    message: `Book marked as taken successfully. Please return by ${returnDeadline.toLocaleTimeString()}`,
    request,
    returnDeadline
  });
});





const returnBook = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ 
        status: "failed", 
        message: "Invalid request ID format" 
      });
    }

    // Fetch the request with book populated
    const request = await BookRequest.findById(requestId)
      .populate("book")
      .session(session);

    if (!request) {
      return res.status(404).json({ 
        status: "failed", 
        message: "Book request not found" 
      });
    }

    // Validate book status
    if (request.status !== "taken" || !request.takenAt) {
      return res.status(400).json({ 
        status: "failed", 
        message: "This book was not borrowed" 
      });
    }

    // Verify the book exists
    const book = await Book.findById(request.book._id).session(session);
    if (!book) {
      return res.status(404).json({ 
        status: "failed", 
        message: "Associated book not found" 
      });
    }

    // Process updates in parallel
    const [updatedBook, releasedSeat] = await Promise.all([
      // 1. Update book availability
      Book.findByIdAndUpdate(
        book._id,
        { $inc: { availableCopies: 1 } },
        { new: true, session }
      ),
      
      // 2. Release the seat
      request.seat ? Seat.findOneAndUpdate(
        { seatNumber: request.seat },
        { 
          isAvailable: true,
          reservedBy: null,
          releasedAt: new Date() 
        },
        { new: true, session }
      ) : Promise.resolve(null)
    ]);

    // Mark request as returned
    request.status = "returned";
    request.returnedAt = new Date();
    await request.save({ session });

    await NotifcactionForseat.create({
      user: request.student,
      book: book._id,
      seat: request.seat,
      message: `You have successfully returned "${book.name}" from seat ${request.seat}.`,
      type: 'return_confirmation'
    });

    // Check wishlist for next student
    const nextWishlistEntry = await Wishlist.findOne({ book: book._id })
      .sort("createdAt")
      .populate("student book")
      .session(session);

    const responseData = {
      status: "success",
      message: "Book and seat successfully released",
      details: {
        book: {
          id: book._id,
          title: book.name,
          availableCopies: updatedBook.availableCopies
        },
        seatReleased: request.seat ? true : false
      }
    };

    if (nextWishlistEntry) {
      // Create new pending request WITHOUT seat assignment
      const newRequest = await BookRequest.create([{
        student: nextWishlistEntry.student._id,
        book: nextWishlistEntry.book._id,
        status: "pending",
        seat: null // No seat assigned yet
      }], { session });

      // Remove from wishlist and notify student
      await Promise.all([
        Wishlist.findByIdAndDelete(nextWishlistEntry._id, { session }),
        Notification.create([{
          user: nextWishlistEntry.student._id,
          book: nextWishlistEntry.book._id,
          message: `The book "${nextWishlistEntry.book.name}" is now available. ` +
                  "Please visit the library to request it."
        }], { session })
      ]);

      responseData.nextStudent = {
        studentId: nextWishlistEntry.student._id,
        newRequestId: newRequest[0]._id,
        notification: "Student notified about availability"
      };
    }

    await session.commitTransaction();
    res.status(200).json(responseData);

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ 
      status: "failed", 
      message: "Error processing return",
      error: error.message.replace(/^CastError: /, "")
    });
  } finally {
    session.endSession();
  }
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





///  THIS IS FOR THE DASHBORAD ONLY TO DISPLAY THE REQUESTED COUNT IN THE 





// @desc    Get counts of all requested, taken, and returned books
// @route   GET /api/requests/counts
// @access  Private (library-staff)
const getRequestCounts = asyncHandler(async (req, res) => {
  try {
    // Count all requests grouped by status
    const counts = await BookRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert array to object for easier access
    const result = {
      requested: 0,
      taken: 0,
      returned: 0
    };

    counts.forEach(item => {
      switch(item._id) {
        case 'pending':
          result.requested = item.count;
          break;
        case 'taken':
          result.taken = item.count;
          break;
        case 'returned':
          result.returned = item.count;
          break;
      }
    });

    // Count all books (sum of all statuses)
    result.total = result.requested + result.taken + result.returned;

    res.status(200).json({
      status: "success",
      data: result
    });

  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to get request counts",
      error: error.message
    });
  }
});

// @desc    Get detailed counts with book information
// @route   GET /api/requests/counts/detailed
// @access  Private (library-staff)
const getDetailedRequestCounts = asyncHandler(async (req, res) => {
  try {
    // Get counts by status
    const statusCounts = await BookRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get most requested books
    const popularBooks = await BookRequest.aggregate([
      {
        $match: { book: { $ne: null } }
      },
      {
        $group: {
          _id: "$book",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "_id",
          as: "bookDetails"
        }
      },
      { $unwind: "$bookDetails" },
      {
        $project: {
          bookName: "$bookDetails.name",
          category: "$bookDetails.category",
          count: 1
        }
      }
    ]);

    // Get recent activity
    const recentActivity = await BookRequest.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("student", "firstName lastName email")
      .populate("book", "name category author");

    const result = {
      counts: {
        requested: 0,
        taken: 0,
        returned: 0,
        total: 0
      },
      popularBooks,
      recentActivity
    };

    // Fill in the counts
    statusCounts.forEach(item => {
      switch(item._id) {
        case 'pending':
          result.counts.requested = item.count;
          break;
        case 'taken':
          result.counts.taken = item.count;
          break;
        case 'returned':
          result.counts.returned = item.count;
          break;
      }
    });

    result.counts.total = result.counts.requested + result.counts.taken + result.counts.returned;

    res.status(200).json({
      status: "success",
      data: result
    });

  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to get detailed request counts",
      error: error.message
    });
  }
});





module.exports = {
  requestBook,
  approveBookRequest,
  returnBook,
  deleteBookRequest, // ✅ New delete function added
  getAllBookRequests,



  getRequestCounts,
  getDetailedRequestCounts,
};







// const { Expo } = require('expo-server-sdk'); // Add this at the top of your file
// const expo = new Expo();

// const approveBookRequest = asyncHandler(async (req, res) => {
//   const { requestId } = req.params;
//   const staffId = res.locals.id;

//   // Validate request ID
//   if (!mongoose.Types.ObjectId.isValid(requestId)) {
//     return res.status(400).json({ status: "failed", message: "Invalid request ID format" });
//   }

//   // Check if the user is authorized (library-staff)
//   const staff = await User.findById(staffId);
//   if (!staff || staff.role !== "library-staff") {
//     return res.status(403).json({ status: "failed", message: "Only library staff can approve requests" });
//   }

//   // Fetch the request and populate the associated book and student
//   const request = await BookRequest.findById(requestId)
//     .populate("book")
//     .populate("student"); // Populate the student to get their pushToken

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
//     { $inc: { availableCopies: -1 } },
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
//   availableSeat.reservedBy = request.student;
//   availableSeat.reservedAt = new Date();
//   await availableSeat.save();

//   // Update the request status to 'taken' and assign the seat
//   request.status = "taken";
//   request.takenBy = staffId;
//   request.takenAt = new Date();
//   request.seat = availableSeat.seatNumber;
//   await request.save();

//   // Create a notification for the student
//   const notification = await NotifcactionForseat.create({
//     user: request.student._id,
//     book: book._id,
//     seat: availableSeat.seatNumber,
//     message: `Your book "${book.name}" has been approved. Assigned seat: ${availableSeat.seatNumber}. Please collect your book within 2 hours.`,
//   });

//   // Get the student's Expo push token
//   const student = await User.findById(request.student._id);
//   const pushToken = student.expoPushToken; // Ensure this field exists in your User model

//   // Send the push notification to the student
//   if (pushToken && Expo.isExpoPushToken(pushToken)) {
//     const message = {
//       to: pushToken,
//       sound: 'default',
//       title: '📚 Book Approved!',
//       body: `Your book "${book.name}" is ready. Seat: ${availableSeat.seatNumber}`,
//       data: { 
//         bookId: book._id, 
//         seat: availableSeat.seatNumber,
//         notificationId: notification._id, // For handling taps
//       },
//     };

//     try {
//       await expo.sendPushNotificationsAsync([message]);
//       console.log('Push notification sent successfully!');
//     } catch (error) {
//       console.error('Error sending push notification:', error);
//     }
//   } else {
//     console.warn('Invalid Expo push token:', pushToken);
//   }

//   res.status(200).json({
//     status: "success",
//     message: `Book marked as taken. Seat: ${availableSeat.seatNumber}`,
//     request,
//   });
// });