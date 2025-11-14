const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
    question_id: {
        type: String, // UUID from AssessmentQuestions
        required: true,
    },
    question_text: {
        type: String,
        required: true,
    },
    student_answer: {
        type: mongoose.Schema.Types.Mixed, // Can be string, array, or object
        required: true,
    },
    correct_answer: {
        type: mongoose.Schema.Types.Mixed,
        required: false,
    },
    marks_obtained: {
        type: Number,
        default: 0,
    },
    max_marks: {
        type: Number,
        required: true,
    },
    is_correct: {
        type: Boolean,
        default: false,
    },
    ai_feedback: {
        type: String,
        default: null,
    }
}, { _id: false });

const submissionSchema = new mongoose.Schema(
    {
        assessment_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Assessment",
            required: [true, "Assessment ID is required"],
        },
        student_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: [true, "Student ID is required"],
        },
        answers: {
            type: [answerSchema],
            required: true,
            validate: {
                validator: function (v) {
                    return v && v.length > 0;
                },
                message: "At least one answer is required",
            },
        },
        total_marks_obtained: {
            type: Number,
            default: 0,
        },
        total_marks: {
            type: Number,
            required: true,
        },
        percentage: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["Submitted", "Grading", "Graded"],
            default: "Submitted",
        },
        submitted_at: {
            type: Date,
            default: Date.now,
        },
        graded_at: {
            type: Date,
            default: null,
        },
        time_taken: {
            type: Number, // in minutes
            default: 0,
        },
        ai_grading_notes: {
            type: String,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

// Indexes for faster queries
submissionSchema.index({ assessment_id: 1, student_id: 1 });
submissionSchema.index({ student_id: 1, status: 1 });
submissionSchema.index({ assessment_id: 1, status: 1 });

module.exports = mongoose.model("Submission", submissionSchema);
