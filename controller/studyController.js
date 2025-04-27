const Chapter = require('../model/studyProgress/Chapter');
const Page = require('../model/studyProgress/Page');
const mongoose = require("mongoose");

// Create Chapter and Pages
exports.addChapter = async (req, res) => {
  try {
    const { title, totalPages } = req.body;
    const studentId = res.locals.id; // Assuming you have authentication middleware

    const chapter = await Chapter.create({ title, totalPages, student: studentId });

    // Create pages
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push({ chapter: chapter._id, pageNumber: i });
    }
    await Page.insertMany(pages);

    res.status(201).json({ success: true, message: "Chapter and pages created", chapter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
