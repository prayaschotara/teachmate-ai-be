const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema(
  {
    grade_name: {
      type: String,
      required: [true, "Grade name is required"],
      unique: true,
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

module.exports = mongoose.model("Grade", gradeSchema);
