const Chapter = require('../model/studyProgress/Chapter');
const Page = require('../model/studyProgress/Page');
const mongoose = require("mongoose");
const Student = require('../model/userModel'); // Make sure you have this model

// Create Chapter and Pages (Fixed Version)
const asyncHandler = require('express-async-handler');



// Get Pages by Chapter
exports.getChapterPages = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const pages = await Page.find({ chapter: chapterId }).sort('pageNumber');
    res.status(200).json({ success: true, pages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark Page as Read
exports.markPageRead = async (req, res) => {
  try {
    const { pageId } = req.body;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ success: false, message: "Page not found" });

    page.isRead = true;
    await page.save();

    res.status(200).json({ success: true, message: "Page marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Progress for a Chapter
exports.getProgress = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const totalPages = await Page.countDocuments({ chapter: chapterId });
    const completedPages = await Page.countDocuments({ chapter: chapterId, isRead: true });

    const progress = totalPages === 0 ? 0 : Math.round((completedPages / totalPages) * 100);

    res.status(200).json({
      success: true,
      completedPages,
      totalPages,
      progressPercent: progress,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
