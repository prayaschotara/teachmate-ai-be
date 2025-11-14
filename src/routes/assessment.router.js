const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessment.controller');

// Generate assessment (session or chapter)
router.post('/generate', assessmentController.generateAssessment);

// Get assessment by ID
router.get('/:id', assessmentController.getAssessment);

// Get assessment questions
router.get('/:id/questions', assessmentController.getAssessmentQuestions);

// Get all assessments for a teacher
router.get('/teacher/:teacherId', assessmentController.getTeacherAssessments);

// Update assessment status
router.patch('/:id/status', assessmentController.updateStatus);

module.exports = router;
