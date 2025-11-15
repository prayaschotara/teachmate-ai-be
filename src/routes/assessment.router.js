const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessment.controller');
const validateToken = require('../middlewares/auth-guard');

// All routes require authentication
// Generate assessment (session or chapter)
router.post('/generate', validateToken, assessmentController.generateAssessment);

// Get assessment by ID
router.get('/:id', validateToken, assessmentController.getAssessment);

// Get assessment questions
router.get('/:id/questions', validateToken, assessmentController.getAssessmentQuestions);

// Get all assessments for a teacher
router.get('/teacher/:teacherId', validateToken, assessmentController.getTeacherAssessments);

// Update assessment status
router.patch('/:id/status', validateToken, assessmentController.updateStatus);

// Student-facing routes
// Get student performance data
router.get('/student/performance', validateToken, assessmentController.getStudentPerformance);

// Parent-facing routes
// Get child performance data (requires child_id query parameter)
router.get('/child/performance', validateToken, assessmentController.getChildPerformance);

// Get active assessments by class
router.get('/student/class/:classId', validateToken, assessmentController.getActiveAssessmentsByClass);

// Get active assessments by grade
router.get('/student/grade/:gradeId', validateToken, assessmentController.getActiveAssessmentsByGrade);

// Get all assessments with filters (for student portal)
router.get('/student/all', validateToken, assessmentController.getStudentAssessments);

module.exports = router;
