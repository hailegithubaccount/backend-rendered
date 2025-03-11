const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const BookRequest = require("../model/bookRequest");
const Book = require("../model/bookModel");
const User = require("../model/userModel");

// ✅ Request a Book (Students Only)


const Wishlist = require("../model/wishlistModel");



const addToWishlist = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const studentId = res.locals.id;
  
    // ✅ Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ status: "failed", message: "Book not found" });
    }
  
    // ✅ Check if already in wishlist
    const existingWishlist = await Wishlist.findOne({ student: studentId, book: bookId });
    if (existingWishlist) {
      return res.status(400).json({ status: "failed", message: "Book already in wishlist" });
    }
  
    // ✅ Add to wishlist
    await Wishlist.create({ student: studentId, book: bookId });
  
    res.status(200).json({ status: "success", message: "Book added to wishlist." });
  });

  
const getWishlist = asyncHandler(async (req, res) => {
    const studentId = res.locals.id;
    const wishlist = await Wishlist.find({ student: studentId })
      .populate("book", "title author");
  
    res.status(200).json({ status: "success", wishlist });
  });
  

 
  module.exports = {
    addToWishlist,
    getWishlist,
   
   
  };  