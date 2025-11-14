const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submission.controller');

// Submit an assessment
router.post('/submit', submissionController.submitAssessment);

// Get submission by ID
router.get('/:id', submissionController.getSubmission);

// Get all submissions for an assessment
router.get('/assessment/:assessmentId', submissionController.getAssessmentSubmissions);

// Get all submissions by a student
router.get('/student/:studentId', submissionController.getStudentSubmissions);

// Get ungraded submissions
router.get('/ungraded/all', submissionController.getUngradedSubmissions);

// Manual trigger for grading (for testing)
router.post('/grade/trigger', submissionController.triggerManualGrading);

module.exports = router;
