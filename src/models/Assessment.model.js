const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Assessment title is required"],
      trim: true,
    },
    lesson_plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LessonPlan",
      required: [true, "Lesson Plan ID is required"],
    },
    opens_on: {
      type: Date,
      required: [true, "Opens on date is required"],
    },
    due_date: {
      type: Date,
      required: [true, "Due date is required"],
      validate: {
        validator: function (v) {
          return v > this.opens_on;
        },
        message: "Due date must be after opens on date",
      },
    },
    status: {
      type: String,
      enum: ["Draft", "Scheduled", "Active", "Closed", "Graded"],
      default: "Draft",
    },
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class ID is required"],
    },
    grade_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grade",
      required: [true, "Grade ID is required"],
    },
    grade_name: {
      type: String,
      required: [true, "Grade name is required"],
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject ID is required"],
    },
    subject_name: {
      type: String,
      required: [true, "Subject name is required"],
    },
    topics: {
      type: [String],
      required: [true, "At least one topic is required"],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "Topics array cannot be empty",
      },
    },
    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher ID is required"],
    },
    total_marks: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,  // in minutes
      required: [true, "Duration is required"],
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

// Indexes for faster queries
assessmentSchema.index({ teacher_id: 1, status: 1 });
assessmentSchema.index({ class_id: 1, subject_id: 1 });
assessmentSchema.index({ opens_on: 1, due_date: 1 });
assessmentSchema.index({ grade_id: 1, subject_id: 1 });

module.exports = mongoose.model("Assessment", assessmentSchema);
