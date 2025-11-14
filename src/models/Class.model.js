const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    class_name: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
    },
    class_strength: {
      type: Number,
      required: [true, "Class strength is required"],
      min: [1, "Class strength must be at least 1"],
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Class", classSchema);
