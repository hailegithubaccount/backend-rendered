const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
    createdAt: { type: Date, default: Date.now }
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
