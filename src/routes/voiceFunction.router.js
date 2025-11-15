const express = require("express");
const router = express.Router();
const voiceFunctionController = require("../controllers/voiceFunction.controller");

// Retell function endpoints
router.post("/search_knowledge_base", voiceFunctionController.searchKnowledgeBase);
router.post("/get_student_progress", voiceFunctionController.getStudentProgress);
router.post("/get_upcoming_assessments", voiceFunctionController.getUpcomingAssessments);

module.exports = router;
