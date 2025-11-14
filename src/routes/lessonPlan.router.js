const express = require('express');
const router = express.Router();
const lessonPlanController = require('../controllers/lessonPlan.controller');

// Generate new lesson plan (original - requires all IDs)
router.post('/generate', lessonPlanController.generateLessonPlan);

// Generate dynamic lesson plan (new - flexible input)
router.post('/generate-dynamic', lessonPlanController.generateDynamicLessonPlan);

// Generate lesson plan preview (doesn't save)
router.post('/preview', lessonPlanController.previewLessonPlan);

// Generate lesson plan with simplified field names
router.post('/generate-simple', lessonPlanController.generateSimpleLessonPlan);

// Get lesson plan by ID
router.get('/:id', lessonPlanController.getLessonPlan);

// Get all lesson plans for a teacher
router.get('/teacher/:teacherId', lessonPlanController.getTeacherLessonPlans);

// Update lesson plan status
router.patch('/:id/status', lessonPlanController.updateStatus);

// Delete lesson plan
router.delete('/:id', lessonPlanController.deleteLessonPlan);

module.exports = router;
