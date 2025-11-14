const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    subject_name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    grade_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grade",
      required: [true, "Grade ID is required"],
    },
    grade_name: {
      type: String,
      required: [true, "Grade name is required"],
      trim: true,
    },
    classes: [
      {
        class_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Class",
          required: true,
        },
        class_name: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subject", subjectSchema);
