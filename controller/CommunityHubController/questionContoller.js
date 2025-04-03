const Question = require("../../model/CommutiyHUbmodel/question");
const Answer = require("../../model/CommutiyHUbmodel/answer");
const asyncHandler = require("express-async-handler");
const mongoose = require('mongoose');

// @desc    Get all questions
// @route   GET /api/community/questions
// @access  Public
const getAllQuestions = asyncHandler(async (req, res) => {
  const questions = await Question.find()
    .populate("author", "firstName lastName email")
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: questions.length,
    data: questions
  });
});

// @desc    Get a single question
// @route   GET /api/community/questions/:id
// @access  Public
const getQuestion = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid question ID" });
  }

  const question = await Question.findById(req.params.id)
    .populate("author", "firstName lastName email")
    .populate({
      path: "answers",
      populate: {
        path: "author",
        select: "firstName lastName email"
      }
    });

  if (!question) {
    return res.status(404).json({ status: "failed", message: "Question not found" });
  }

  question.views += 1;
  await question.save();

  res.status(200).json({
    status: "success",
    data: question
  });
});

// @desc    Create a question
// @route   POST /api/community/questions
// @access  Private (students only)
const createQuestion = asyncHandler(async (req, res) => {
  if (res.locals.role !== "student") {
    return res.status(403).json({ 
      status: "failed", 
      message: "Only students can post questions" 
    });
  }

  const { title, content } = req.body;

  const question = await Question.create({
    title,
    content,
    
    author: res.locals.id
  });

  res.status(201).json({
    status: "success",
    data: question
  });
});

// @desc    Update a question
// @route   PATCH /api/community/questions/:id
// @access  Private (question author or admin)
const updateQuestion = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid question ID" });
  }

  const question = await Question.findById(req.params.id);

  if (!question) {
    return res.status(404).json({ status: "failed", message: "Question not found" });
  }

  // Check if user is the author or admin
  if (question.author.toString() !== res.locals.id && res.locals.role !== "admin") {
    return res.status(403).json({ 
      status: "failed", 
      message: "Not authorized to update this question" 
    });
  }

  const updatedQuestion = await Question.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: updatedQuestion
  });
});

// @desc    Delete a question
// @route   DELETE /api/community/questions/:id
// @access  Private (question author or admin)
const deleteQuestion = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid question ID" });
  }

  const question = await Question.findById(req.params.id);

  if (!question) {
    return res.status(404).json({ status: "failed", message: "Question not found" });
  }

  // Check if user is the author or admin
  if (question.author.toString() !== res.locals.id && res.locals.role !== "student") {
    return res.status(403).json({ 
      status: "failed", 
      message: "Not authorized to delete this question" 
    });
  }

  await question.deleteOne();

  res.status(204).json({
    status: "success",
    data: null
  });
});

// @desc    Upvote a question
// @route   POST /api/community/questions/:id/upvote
// @access  Private
const upvoteQuestion = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid question ID" });
  }

  const question = await Question.findById(req.params.id);

  if (!question) {
    return res.status(404).json({ status: "failed", message: "Question not found" });
  }

  // Check if user already upvoted
  if (question.upvotes.includes(res.locals.id)) {
    return res.status(400).json({ 
      status: "failed", 
      message: "You have already upvoted this question" 
    });
  }

  // Remove from downvotes if exists
  if (question.downvotes.includes(res.locals.id)) {
    question.downvotes = question.downvotes.filter(
      id => id.toString() !== res.locals.userId
    );
  }

  question.upvotes.push(res.locals.id);
  await question.save();

  res.status(200).json({
    status: "success",
    data: question
  });
});

// @desc    Downvote a question
// @route   POST /api/community/questions/:id/downvote
// @access  Private
const downvoteQuestion = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid question ID" });
  }

  const question = await Question.findById(req.params.id);

  if (!question) {
    return res.status(404).json({ status: "failed", message: "Question not found" });
  }

  // Check if user already downvoted
  if (question.downvotes.includes(res.locals.id)) {
    return res.status(400).json({ 
      status: "failed", 
      message: "You have already downvoted this question" 
    });
  }

  // Remove from upvotes if exists
  if (question.upvotes.includes(res.locals.id)) {
    question.upvotes = question.upvotes.filter(
      id => id.toString() !== res.locals.userId
    );
  }

  question.downvotes.push(res.locals.id);
  await question.save();

  res.status(200).json({
    status: "success",
    data: question
  });
});


 module.exports = {
   
    downvoteQuestion,
    upvoteQuestion,
    deleteQuestion,
    updateQuestion,
    createQuestion,
    getQuestion,
    getAllQuestions,
    

    

    
  };