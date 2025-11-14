const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const questionSchema = new mongoose.Schema({
  question_id: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  question: {
    type: String,
    required: [true, "Question text is required"],
  },
  input_type: {
    type: String,
    enum: ["MCQ", "Multiple Select", "Short Answer", "Long Answer", "True/False", "Fill in the Blank"],
    required: [true, "Input type is required"],
  },
  answers: {
    type: [
      {
        option: String,
        is_correct: Boolean,
        explanation: String,
      },
    ],
    default: [],
  },
  marks: {
    type: Number,
    required: [true, "Marks for question is required"],
    min: [0, "Marks cannot be negative"],
  },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Medium",
  },
  topic: {
    type: String,
    required: [true, "Topic is required"],
  },
  order: {
    type: Number,
    default: 0,
  },
}, { _id: false });

const assessmentQuestionsSchema = new mongoose.Schema(
  {
    assessment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: [true, "Assessment ID is required"],
    },
    questions: {
      type: [questionSchema],
      required: [true, "At least one question is required"],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "Questions array cannot be empty",
      },
    },
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class ID is required"],
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject ID is required"],
    },
    grade_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grade",
      required: [true, "Grade ID is required"],
    },
    total_marks: {
      type: Number,
      default: 0,
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

// Calculate total marks before saving
assessmentQuestionsSchema.pre("save", function (next) {
  if (this.questions && this.questions.length > 0) {
    this.total_marks = this.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  }
  next();
});

// Indexes for faster queries
assessmentQuestionsSchema.index({ assessment_id: 1 });
assessmentQuestionsSchema.index({ class_id: 1, subject_id: 1 });
assessmentQuestionsSchema.index({ grade_id: 1, subject_id: 1 });

module.exports = mongoose.model("AssessmentQuestions", assessmentQuestionsSchema);
