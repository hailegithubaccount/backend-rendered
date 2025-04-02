const Question = require("../../model/CommutiyHUbmodel/question");
const Answer = require("../../model/CommutiyHUbmodel/answer");
const asyncHandler = require("express-async-handler");
const mongoose = require('mongoose');

// @desc    Get all answers for a question
// @route   GET /api/community/questions/:questionId/answers
// @access  Public
const getAnswersForQuestion = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.questionId)) {
    return res.status(400).json({ status: "failed", message: "Invalid question ID" });
  }

  const answers = await Answer.find({ question: req.params.questionId })
    .populate("author", "firstName lastName email")
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: answers.length,
    data: answers
  });
});

// @desc    Create an answer
// @route   POST /api/community/questions/:questionId/answers
// @access  Private (students only)
const createAnswer = asyncHandler(async (req, res) => {
  console.log('=== STARTING ANSWER CREATION ===');
  console.log('Params:', req.params);
  console.log('Body:', req.body);
  console.log('User ID:', res.locals.id);
  console.log('User Role:', res.locals.role);
  try {
    // 1. Authorization Check
    if (res.locals.role !== "student") {
      return res.status(403).json({ 
        status: "failed", 
        message: "Only students can post answers" 
      });
    }

    // 2. Input Validation
    const { content } = req.body;
    const { questionId } = req.params;

    if (!content?.trim()) {
      return res.status(400).json({
        status: "failed",
        message: "Answer content cannot be empty"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid question ID format"
      });
    }

    // 3. Verify Question Exists
    const question = await Question.findById(questionId)
      .select('_id answers isSolved')
      .lean();

    if (!question) {
      return res.status(404).json({
        status: "failed",
        message: "Question not found"
      });
    }

    if (question.isSolved) {
      return res.status(403).json({
        status: "failed",
        message: "Cannot add answers to solved questions"
      });
    }

    // 4. Create Answer (Transaction recommended)
    const answer = await Answer.create({
      content: content.trim(),
      question: questionId,
      author: res.locals.id,
      upvotes: [],
      downvotes: []
    });

    // 5. Update Question
    await Question.findByIdAndUpdate(
      questionId,
      { $push: { answers: answer._id } },
      { new: true }
    );

    // 6. Optimized Response
    res.status(201).json({
      status: "success",
      data: {
        id: answer._id,
        content: answer.content,
        questionId: answer.question,
        author: {
          id: res.locals.id,
          role: res.locals.role
        },
        stats: {
          upvotes: answer.upvotes.length,
          downvotes: answer.downvotes.length
        },
        createdAt: answer.createdAt
      }
    });

  } catch (error) {
    console.error("Answer Creation Error:", error);
    
    // Handle duplicate answers
    if (error.code === 11000 && error.keyPattern?.content) {
      return res.status(409).json({
        status: "failed",
        message: "Similar answer already exists"
      });
    }

    res.status(500).json({
      status: "error",
      message: process.env.NODE_ENV === "development" 
        ? error.message 
        : "Internal server error"
    });
  }
});

// @desc    Update an answer
// @route   PATCH /api/community/answers/:id
// @access  Private (answer author or admin)
// const updateAnswer = asyncHandler(async (req, res) => {
//   if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
//     return res.status(400).json({ status: "failed", message: "Invalid answer ID" });
//   }

//   const answer = await Answer.findById(req.params.id);

//   if (!answer) {
//     return res.status(404).json({ status: "failed", message: "Answer not found" });
//   }

//   // Check if user is the author or admin
//   if (answer.author.toString() !== res.locals.id && res.locals.role !== "admin") {
//     return res.status(403).json({ 
//       status: "failed", 
//       message: "Not authorized to update this answer" 
//     });
//   }

//   const updatedAnswer = await Answer.findByIdAndUpdate(
//     req.params.id,
//     req.body,
//     { new: true, runValidators: true }
//   );

//   res.status(200).json({
//     status: "success",
//     data: updatedAnswer
//   });
// });

// @desc    Delete an answer
// @route   DELETE /api/community/answers/:id
// @access  Private (answer author or admin)
const deleteAnswer = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid answer ID" });
  }

  const answer = await Answer.findById(req.params.id);

  if (!answer) {
    return res.status(404).json({ status: "failed", message: "Answer not found" });
  }

  // Check if user is the author or admin
  if (answer.author.toString() !== res.locals.userId && res.locals.role !== "admin") {
    return res.status(403).json({ 
      status: "failed", 
      message: "Not authorized to delete this answer" 
    });
  }

  // Remove answer from question's answers array
  await Question.findByIdAndUpdate(answer.question, {
    $pull: { answers: answer._id }
  });

  await answer.deleteOne();

  res.status(204).json({
    status: "success",
    data: null
  });
});

// @desc    Accept an answer
// @route   PATCH /api/community/answers/:id/accept
// @access  Private (question author only)
const acceptAnswer = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid answer ID" });
  }

  const answer = await Answer.findById(req.params.id);

  if (!answer) {
    return res.status(404).json({ status: "failed", message: "Answer not found" });
  }

  const question = await Question.findById(answer.question);

  // Check if user is the question author
  if (question.author.toString() !== res.locals.userId) {
    return res.status(403).json({ 
      status: "failed", 
      message: "Only the question author can accept an answer" 
    });
  }

  // Unaccept any previously accepted answer for this question
  await Answer.updateMany(
    { question: answer.question, _id: { $ne: answer._id } },
    { isAccepted: false }
  );

  // Accept this answer
  answer.isAccepted = true;
  await answer.save();

  // Mark question as solved
  question.solved = true;
  question.acceptedAnswer = answer._id;
  await question.save();

  res.status(200).json({
    status: "success",
    data: answer
  });
});

// @desc    Upvote an answer
// @route   POST /api/community/answers/:id/upvote
// @access  Private
const upvoteAnswer = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid answer ID" });
  }

  const answer = await Answer.findById(req.params.id);

  if (!answer) {
    return res.status(404).json({ status: "failed", message: "Answer not found" });
  }

  // Check if user already upvoted
  if (answer.upvotes.includes(res.locals.userId)) {
    return res.status(400).json({ 
      status: "failed", 
      message: "You have already upvoted this answer" 
    });
  }

  // Remove from downvotes if exists
  if (answer.downvotes.includes(res.locals.userId)) {
    answer.downvotes = answer.downvotes.filter(
      id => id.toString() !== res.locals.userId
    );
  }

  answer.upvotes.push(res.locals.userId);
  await answer.save();

  res.status(200).json({
    status: "success",
    data: answer
  });
});

// @desc    Downvote an answer
// @route   POST /api/community/answers/:id/downvote
// @access  Private
const downvoteAnswer = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ status: "failed", message: "Invalid answer ID" });
  }

  const answer = await Answer.findById(req.params.id);

  if (!answer) {
    return res.status(404).json({ status: "failed", message: "Answer not found" });
  }

  // Check if user already downvoted
  if (answer.downvotes.includes(res.locals.userId)) {
    return res.status(400).json({ 
      status: "failed", 
      message: "You have already downvoted this answer" 
    });
  }

  // Remove from upvotes if exists
  if (answer.upvotes.includes(res.locals.userId)) {
    answer.upvotes = answer.upvotes.filter(
      id => id.toString() !== res.locals.userId
    );
  }

  answer.downvotes.push(res.locals.userId);
  await answer.save();

  res.status(200).json({
    status: "success",
    data: answer
  });
});





 module.exports = {
   
    downvoteAnswer,
    upvoteAnswer,
    acceptAnswer ,
    deleteAnswer,
  
    getAnswersForQuestion,
    createAnswer

    

    

    
  };