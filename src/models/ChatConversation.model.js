const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant", "system"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  sources: [{
    subject: String,
    topic: String,
    score: Number,
  }],
}, { _id: false });

const chatConversationSchema = new mongoose.Schema(
  {
    user_type: {
      type: String,
      enum: ["student", "parent"],
      required: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID is required"],
    },
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parents",
      default: null,
    },
    session_id: {
      type: String,
      required: true,
      unique: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    selected_chapters: {
      type: [Number],
      default: [],
    },
    subject_context: {
      type: String,
      default: null,
    },
    topic_context: {
      type: String,
      default: null,
    },
    needs_teacher_attention: {
      type: Boolean,
      default: false,
    },
    teacher_notified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Active", "Closed", "Archived"],
      default: "Active",
    },
    last_activity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
chatConversationSchema.index({ student_id: 1, status: 1 });
chatConversationSchema.index({ session_id: 1 });
chatConversationSchema.index({ last_activity: -1 });

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
