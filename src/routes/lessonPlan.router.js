const express = require('express');
const router = express.Router();
const lessonPlanController = require('../controllers/lessonPlan.controller');
const validateToken = require('../middlewares/auth-guard');

// Generate new lesson plan (original - requires all IDs)
router.post('/generate', validateToken, lessonPlanController.generateLessonPlan);

// Generate dynamic lesson plan (new - flexible input)
router.post('/generate-dynamic', validateToken, lessonPlanController.generateDynamicLessonPlan);

// Generate lesson plan preview (doesn't save)
router.post('/preview', validateToken, lessonPlanController.previewLessonPlan);

// Generate lesson plan with simplified field names
router.post('/generate-simple', validateToken, lessonPlanController.generateSimpleLessonPlan);

// Get lesson plan by ID
router.get('/:id', validateToken, lessonPlanController.getLessonPlan);

// Get all lesson plans for a teacher
router.get('/teacher/:teacherId', validateToken, lessonPlanController.getTeacherLessonPlans);

// Update lesson plan status
router.patch('/:id/status', validateToken, lessonPlanController.updateStatus);

// Delete lesson plan
router.delete('/:id', validateToken, lessonPlanController.deleteLessonPlan);

// Workflow endpoints
router.post('/:id/trigger-content-curation', validateToken, lessonPlanController.triggerContentCuration);
router.post('/:id/trigger-assessment', validateToken, lessonPlanController.triggerAssessment);
router.post('/:id/execute-workflow', validateToken, lessonPlanController.executeCompleteWorkflow);

module.exports = router;
