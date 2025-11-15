const express = require("express");
const router = express.Router();
const voiceCallController = require("../controllers/voiceCall.controller");

// Start voice calls
router.post("/student/start", voiceCallController.startStudentVoiceCall);
router.post("/parent/start", voiceCallController.startParentVoiceCall);

// Retell webhook (Custom LLM endpoint)
router.post("/webhook", voiceCallController.handleRetellWebhook);

// Test endpoint to verify webhook accessibility
router.get("/webhook/test", (req, res) => {
  res.json({ 
    message: "Webhook endpoint is accessible", 
    timestamp: new Date().toISOString(),
    ngrok_url: process.env.NGROK_URL 
  });
});

// Call management
router.get("/history/:student_id", voiceCallController.getCallHistory);
router.post("/end/:call_id", voiceCallController.endCall);

module.exports = router;
