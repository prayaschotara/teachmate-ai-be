const LessonPlanningAgent = require('../agents/lessonPlanningAgent');
const LessonPlan = require('../models/LessonPlan.model');

const lessonPlanController = {
  /**
   * Generate a new lesson plan
   * POST /api/lesson-plan/generate
   */
  async generateLessonPlan(req, res) {
    try {
      const {
        teacher_id,
        subject_id,
        grade_id,
        chapter_id,
        chapter_number,
        sessions
      } = req.body;

      // Validate required fields
      if (!teacher_id || !subject_id || !grade_id || !chapter_id || !chapter_number || !sessions) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: teacher_id, subject_id, grade_id, chapter_id, chapter_number, sessions'
        });
      }

      // Validate sessions
      if (sessions < 1 || sessions > 20) {
        return res.status(400).json({
          success: false,
          message: 'Sessions must be between 1 and 20'
        });
      }

      // Initialize agent
      const agent = new LessonPlanningAgent();

      // Generate lesson plan
      const result = await agent.generate(req.body);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Lesson plan generated successfully',
        data: result.lessonPlan
      });

    } catch (error) {
      console.error('Error in generateLessonPlan controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Get lesson plan by ID
   * GET /api/lesson-plan/:id
   */
  async getLessonPlan(req, res) {
    try {
      const { id } = req.params;

      const lessonPlan = await LessonPlan.findById(id)
        .populate('teacher_id', 'name email')
        .populate('subject_id', 'subject_name')
        .populate('grade_id', 'grade_name')
        .populate('chapter_id', 'chapter_name');

      if (!lessonPlan) {
        return res.status(404).json({
          success: false,
          message: 'Lesson plan not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: lessonPlan
      });

    } catch (error) {
      console.error('Error in getLessonPlan controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Get all lesson plans for a teacher
   * GET /api/lesson-plan/teacher/:teacherId
   */
  async getTeacherLessonPlans(req, res) {
    try {
      const { teacherId } = req.params;
      const { status, subject_id, grade_id } = req.query;

      const filter = { teacher_id: teacherId };
      
      if (status) filter.status = status;
      if (subject_id) filter.subject_id = subject_id;
      if (grade_id) filter.grade_id = grade_id;

      const lessonPlans = await LessonPlan.find(filter)
        .populate('subject_id', 'subject_name')
        .populate('grade_id', 'grade_name')
        .populate('chapter_id', 'chapter_name')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: lessonPlans.length,
        data: lessonPlans
      });

    } catch (error) {
      console.error('Error in getTeacherLessonPlans controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Update lesson plan status
   * PATCH /api/lesson-plan/:id/status
   */
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['Draft', 'Active', 'Completed', 'Archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const lessonPlan = await LessonPlan.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!lessonPlan) {
        return res.status(404).json({
          success: false,
          message: 'Lesson plan not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Status updated successfully',
        data: lessonPlan
      });

    } catch (error) {
      console.error('Error in updateStatus controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Delete lesson plan
   * DELETE /api/lesson-plan/:id
   */
  async deleteLessonPlan(req, res) {
    try {
      const { id } = req.params;

      const lessonPlan = await LessonPlan.findByIdAndDelete(id);

      if (!lessonPlan) {
        return res.status(404).json({
          success: false,
          message: 'Lesson plan not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lesson plan deleted successfully'
      });

    } catch (error) {
      console.error('Error in deleteLessonPlan controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = lessonPlanController;
