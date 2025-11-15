const mongoose = require("mongoose");

const voiceCallSchema = new mongoose.Schema(
  {
    call_id: {
      type: String,
      required: true,
      unique: true,
    },
    user_type: {
      type: String,
      enum: ["student", "parent"],
      required: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parents",
      default: null,
    },
    chat_session_id: {
      type: String,
      default: null,
    },
    retell_call_id: {
      type: String,
      required: true,
    },
    access_token: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["initiated", "ongoing", "ended", "failed"],
      default: "initiated",
    },
    duration: {
      type: Number,
      default: 0,
    },
    transcript: {
      type: String,
      default: "",
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    ended_at: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

voiceCallSchema.index({ student_id: 1, status: 1 });
voiceCallSchema.index({ retell_call_id: 1 });
voiceCallSchema.index({ call_id: 1 });

module.exports = mongoose.model("VoiceCall", voiceCallSchema);
