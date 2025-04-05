const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    entityType: {
      type: String,
      enum: ["question", "answer"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "entityType", // Dynamically reference the model based on entityType
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    reason: {
      type: String,
      required: [true, "Reason for the report is required"],
      minlength: [10, "Reason must be at least 10 characters"],
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    resolvedAt: {
      type: Date,
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

// Virtual property to fetch the content dynamically
reportSchema.virtual("content").get(async function () {
  try {
    if (this.entityType === "question") {
      const Question = mongoose.model("Question"); // Assuming you have a Question model
      const question = await Question.findById(this.entityId);
      return question ? question.content : "Question not found";
    } else if (this.entityType === "answer") {
      const Answer = mongoose.model("Answer"); // Assuming you have an Answer model
      const answer = await Answer.findById(this.entityId);
      return answer ? answer.content : "Answer not found";
    }
    return "Unknown entity type";
  } catch (error) {
    console.error("Error fetching content:", error);
    return "Error retrieving content";
  }
});

// Create and export the model
const Report = mongoose.model("Reports", reportSchema);
module.exports = Report;