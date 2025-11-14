const LessonPlanningAgent = require('../agents/lessonPlanningAgent');
const LessonPlan = require('../models/LessonPlan.model');
const AgentWorkflowService = require('../services/agentWorkflow.service');

const lessonPlanController = {
  /**
   * Generate a new lesson plan (original method - requires all IDs)
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

      // Trigger content curation workflow
      const lessonPlanId = result.lessonPlan._id;
      AgentWorkflowService.triggerContentCuration(lessonPlanId)
        .then(curationResult => {
          if (curationResult.success) {
            console.log('✅ Content curation completed in background');
          }
        })
        .catch(err => console.error('Content curation error:', err));

      return res.status(201).json({
        success: true,
        message: 'Lesson plan generated successfully. Content curation started in background.',
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
   * Generate dynamic lesson plan (new method - flexible input)
   * POST /api/lesson-plan/generate-dynamic
   */
  async generateDynamicLessonPlan(req, res) {
    try {
      const {
        subject_name,
        grade_name,
        topic,
        sessions,
        session_duration,
        teacher_id,
        subject_id,
        grade_id,
        chapter_id,
        chapter_number
      } = req.body;

      // Validate required fields (subject, grade, chapter, sessions)
      if (!subject_name || !grade_name || !topic || !sessions) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: subject_name, grade_name, topic, sessions'
        });
      }

      // Validate sessions
      if (sessions < 1 || sessions > 20) {
        return res.status(400).json({
          success: false,
          message: 'Sessions must be between 1 and 20'
        });
      }

      // Validate session duration if provided
      if (session_duration && (session_duration < 30 || session_duration > 120)) {
        return res.status(400).json({
          success: false,
          message: 'Session duration must be between 30 and 120 minutes'
        });
      }

      // Initialize agent
      const agent = new LessonPlanningAgent();

      // Generate lesson plan with dynamic input
      const result = await agent.generate(req.body);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      // Trigger content curation workflow if saved
      if (result.saved && result.lessonPlan._id) {
        AgentWorkflowService.triggerContentCuration(result.lessonPlan._id)
          .then(curationResult => {
            if (curationResult.success) {
              console.log('✅ Content curation completed in background');
            }
          })
          .catch(err => console.error('Content curation error:', err));
      }

      return res.status(201).json({
        success: true,
        message: result.saved
          ? 'Lesson plan generated and saved successfully. Content curation started in background.'
          : 'Lesson plan generated successfully',
        data: result.lessonPlan,
        saved: result.saved || false,
        note: result.message || null
      });

    } catch (error) {
      console.error('Error in generateDynamicLessonPlan controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Generate lesson plan preview (doesn't save to database)
   * POST /api/lesson-plan/preview
   */
  async previewLessonPlan(req, res) {
    try {
      const {
        subject_name,
        grade_name,
        topic,
        sessions,
        session_duration
      } = req.body;

      // Validate required fields
      if (!subject_name || !grade_name || !topic || !sessions) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: subject_name, grade_name, topic, sessions'
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

      // Generate preview
      const result = await agent.generatePreview(req.body);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lesson plan preview generated successfully',
        data: result.preview
      });

    } catch (error) {
      console.error('Error in previewLessonPlan controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Generate lesson plan with simplified field names
   * POST /api/lesson-plan/generate-simple
   */
  async generateSimpleLessonPlan(req, res) {
    try {
      const {
        subject,
        grade,
        chapter,
        sessions,
        session_duration,
        teacher_id,
        subject_id,
        grade_id,
        chapter_id
      } = req.body;

      // Validate required fields (subject, grade, chapter, sessions)
      if (!subject || !grade || !chapter || !sessions) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: subject, grade, chapter, sessions'
        });
      }

      // Validate sessions
      if (sessions < 1 || sessions > 20) {
        return res.status(400).json({
          success: false,
          message: 'Sessions must be between 1 and 20'
        });
      }

      // Validate session duration if provided
      if (session_duration && (session_duration < 30 || session_duration > 120)) {
        return res.status(400).json({
          success: false,
          message: 'Session duration must be between 30 and 120 minutes'
        });
      }

      // Map to agent's expected format
      const agentInput = {
        subject_name: subject,
        grade_name: grade,
        topic: chapter,
        chapter_name: chapter,
        sessions,
        session_duration,
        teacher_id,
        subject_id,
        grade_id,
        chapter_id
      };

      // Initialize agent
      const agent = new LessonPlanningAgent();

      // Generate lesson plan
      const result = await agent.generate(agentInput);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      // Trigger content curation workflow if saved
      if (result.saved && result.lessonPlan._id) {
        AgentWorkflowService.triggerContentCuration(result.lessonPlan._id)
          .then(curationResult => {
            if (curationResult.success) {
              console.log('✅ Content curation completed in background');
            }
          })
          .catch(err => console.error('Content curation error:', err));
      }

      return res.status(201).json({
        success: true,
        message: result.saved
          ? 'Lesson plan generated and saved successfully. Content curation started in background.'
          : 'Lesson plan generated successfully',
        data: result.lessonPlan,
        saved: result.saved || false,
        note: result.message || null
      });

    } catch (error) {
      console.error('Error in generateSimpleLessonPlan controller:', error);
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
      const { status, assessment_config } = req.body;


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

      // Trigger assessment generation when status is changed to 'Completed'
      if (status === 'Completed') {
        AgentWorkflowService.triggerAssessmentGeneration(id, assessment_config || {})
          .then(assessmentResult => {
            if (assessmentResult.success) {
              console.log('✅ Assessment generation completed in background');
            } else {
              console.error('❌ Assessment generation failed:', assessmentResult.error);
            }
          })
          .catch(err => console.error('Assessment generation error:', err));
      }

      return res.status(200).json({
        success: true,
        message: status === 'Completed'
          ? 'Status updated successfully. Assessment generation started in background.'
          : 'Status updated successfully',
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
  },

  /**
   * Manually trigger content curation for a lesson plan
   * POST /api/lesson-plan/:id/trigger-content-curation
   */
  async triggerContentCuration(req, res) {
    try {
      const { id } = req.params;

      const result = await AgentWorkflowService.triggerContentCuration(id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Content curation completed successfully',
        data: {
          videos: result.videos,
          simulations: result.simulations
        }
      });

    } catch (error) {
      console.error('Error in triggerContentCuration controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Manually trigger assessment generation for a lesson plan
   * POST /api/lesson-plan/:id/trigger-assessment
   */
  async triggerAssessment(req, res) {
    try {
      const { id } = req.params;
      const assessmentConfig = req.body;

      const result = await AgentWorkflowService.triggerAssessmentGeneration(id, assessmentConfig);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Assessment generated successfully',
        data: {
          assessment: result.assessment,
          questions: result.questions
        }
      });

    } catch (error) {
      console.error('Error in triggerAssessment controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Execute complete workflow (content curation + assessment if completed)
   * POST /api/lesson-plan/:id/execute-workflow
   */
  async executeCompleteWorkflow(req, res) {
    try {
      const { id } = req.params;
      const assessmentConfig = req.body;

      const result = await AgentWorkflowService.executeCompleteWorkflow(id, assessmentConfig);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Workflow executed successfully',
        data: result.results
      });

    } catch (error) {
      console.error('Error in executeCompleteWorkflow controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = lessonPlanController;
