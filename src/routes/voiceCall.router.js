const express = require("express");
const router = express.Router();
const voiceCallController = require("../controllers/voiceCall.controller");

// Start voice calls
router.post("/student/start", voiceCallController.startStudentVoiceCall);
router.post("/parent/start", voiceCallController.startParentVoiceCall);

// Retell webhook (Custom LLM endpoint)
router.post("/webhook", voiceCallController.handleRetellWebhook);

// Call management
router.get("/history/:student_id", voiceCallController.getCallHistory);
router.post("/end/:call_id", voiceCallController.endCall);

module.exports = router;
