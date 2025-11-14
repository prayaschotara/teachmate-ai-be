const express = require('express');
const router = express.Router();
const lessonPlanController = require('../controllers/lessonPlan.controller');

// Generate new lesson plan
router.post('/generate', lessonPlanController.generateLessonPlan);

// Get lesson plan by ID
router.get('/:id', lessonPlanController.getLessonPlan);

// Get all lesson plans for a teacher
router.get('/teacher/:teacherId', lessonPlanController.getTeacherLessonPlans);

// Update lesson plan status
router.patch('/:id/status', lessonPlanController.updateStatus);

// Delete lesson plan
router.delete('/:id', lessonPlanController.deleteLessonPlan);

module.exports = router;
