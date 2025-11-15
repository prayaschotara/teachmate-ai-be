const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.controller");

// Start new student chat session
router.post("/student/start", chatController.startStudentChat);

// Start new parent chat session
router.post("/parent/start", chatController.startParentChat);

// Send message and get response (works for both student and parent)
router.post("/message", chatController.sendMessage);

// Get chat history for a session
router.get("/history/:session_id", chatController.getChatHistory);

// Get all sessions for a student
router.get("/student/:student_id/sessions", chatController.getStudentSessions);

// Close a chat session
router.patch("/close/:session_id", chatController.closeChatSession);

// Get sessions needing teacher attention (for teachers)
router.get("/attention", chatController.getSessionsNeedingAttention);

module.exports = router;
