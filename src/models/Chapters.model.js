const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
    {
        chapter_name: {
            type: String,
            required: [true, "Chapter name is required"],
            trim: true,
        },
        subject_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: [true, "Subject ID is required"],
        },
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
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: "chapters",
    }
);

// Index for faster queries
chapterSchema.index({ subject_id: 1, grade_id: 1 });
chapterSchema.index({ chapter_name: 1, subject_id: 1 }, { unique: true });

module.exports = mongoose.model("Chapter", chapterSchema);