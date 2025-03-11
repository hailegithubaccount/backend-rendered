const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
     book: { type: mongoose.Schema.Types.ObjectId, ref: "books", required: true },
    createdAt: { type: Date, default: Date.now }
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
