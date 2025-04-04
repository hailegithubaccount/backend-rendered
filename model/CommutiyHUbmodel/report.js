const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
      question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "questions",
          required: true,
        },
    entityType: {
      type: String,
      enum: ["question", "answer"],
      required: true,
    },
    answers: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "answers",
    
          
        },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
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

const Report = mongoose.model("reports", reportSchema);

module.exports = Report;