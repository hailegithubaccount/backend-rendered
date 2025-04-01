const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "Content is required"],
      minlength: [10, "Content must be at least 10 characters"],
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "questions",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    }],
    downvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    }],
    isAccepted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// When an answer is accepted, update the question's isSolved and acceptedAnswer fields
answerSchema.post("save", async function(doc) {
  if (doc.isAccepted) {
    const question = await mongoose.model("questions").findById(doc.question);
    question.isSolved = true;
    question.acceptedAnswer = doc._id;
    await question.save();
  }
});

const Answer = mongoose.model("answers", answerSchema);

module.exports = Answer;