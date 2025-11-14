const mongoose = require("mongoose");

const sessionDetailSchema = new mongoose.Schema({
  session_number: {
    type: Number,
    required: true,
  },
  learning_objectives: {
    type: [String],
    required: true,
  },
  topics_covered: {
    type: [String],
    required: true,
  },
  teaching_flow: [
    {
      time_slot: String,  // e.g., "0-10 min"
      activity: String,   // e.g., "Introduction", "Main teaching"
      description: String,
    },
  ],
  resources: {
    type: mongoose.Schema.Types.Mixed,  // Will be populated later
    default: null,
  },
  assessment: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
    },
  ],
}, { _id: false });

const lessonPlanSchema = new mongoose.Schema(
  {
    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher ID is required"],
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
    grade_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grade",
      required: [true, "Grade ID is required"],
    },
    grade_name: {
      type: String,
      required: [true, "Grade name is required"],
    },
    chapter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: [true, "Chapter ID is required"],
    },
    chapter_name: {
      type: String,
      required: [true, "Chapter name is required"],
    },
    chapter_number: {
      type: Number,
      required: [true, "Chapter number is required"],
    },
    total_sessions: {
      type: Number,
      required: [true, "Total sessions is required"],
      min: [1, "At least 1 session is required"],
    },
    session_duration: {
      type: Number,
      default: 45,  // minutes
    },
    session_details: {
      type: [sessionDetailSchema],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length === this.total_sessions;
        },
        message: "Number of session details must match total sessions",
      },
    },
    chapter_wise_assessment: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assessment",
      },
    ],
    recommended_videos: [
      {
        title: String,
        url: String,
        duration: String,
        topic: String,
        source: String,  // e.g., "YouTube", "Khan Academy"
      },
    ],
    overall_objectives: {
      type: [String],
      required: true,
    },
    learning_outcomes: {
      type: [String],
      required: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Active", "Completed", "Archived"],
      default: "Draft",
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
lessonPlanSchema.index({ teacher_id: 1, chapter_id: 1 });
lessonPlanSchema.index({ subject_id: 1, grade_id: 1 });
lessonPlanSchema.index({ status: 1 });

module.exports = mongoose.model("LessonPlan", lessonPlanSchema);
