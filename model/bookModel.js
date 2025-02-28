const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Book name is required"],
      maxlength: [100, "Book name cannot exceed 100 characters"],
      minlength: [3, "Book name must be at least 3 characters"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      maxlength: [50, "Category cannot exceed 50 characters"],
      minlength: [3, "Category must be at least 3 characters"],
      trim: true,
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      maxlength: [50, "Author name cannot exceed 50 characters"],
      minlength: [3, "Author name must be at least 3 characters"],
      trim: true,
    },
    photo: {
      type: String, // Assuming the photo is stored as a URL or file path
      required: [true, "Photo is required"],
    },
    borrowedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // Reference to the User model (student)
      default: null, // Initially, the book is not borrowed
    },
    borrowedDate: {
      type: Date,
      default: null, // Initially, the book is not borrowed
    },
    returnedDate: {
      type: Date,
      default: null, // Initially, the book is not returned
    },
    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // Reference to the User model (library-staff)
      required: [true, "Library staff is required"],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

const bookModel = mongoose.model("books", bookSchema);

module.exports = bookModel;