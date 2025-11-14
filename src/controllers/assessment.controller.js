const AssessmentGeneratorAgent = require('../agents/assessmentGeneratorAgent');
const Assessment = require('../models/Assessment.model');
const AssessmentQuestions = require('../models/AssessmentQuestions.model');

const assessmentController = {
  /**
   * Generate assessment (session or chapter)
   * POST /api/assessment/generate
   */
  async generateAssessment(req, res) {
    try {
      const {
        lesson_plan_id,
        assessment_type,  // 'session' or 'chapter'
        session_number,   // Required if assessment_type is 'session'
        class_id,
        grade_id,
        subject_id,
        opens_on,
        due_date,
        duration
      } = req.body;

      // Validate required fields
      if (!lesson_plan_id || !assessment_type || !class_id || !grade_id || !subject_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      if (assessment_type === 'session' && !session_number) {
        return res.status(400).json({
          success: false,
          message: 'session_number required for session assessment'
        });
      }

      // Initialize agent
      const agent = new AssessmentGeneratorAgent();

      // Generate assessment
      const result = await agent.generate(req.body);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Assessment generated successfully',
        data: {
          assessment: result.assessment,
          questions: result.questions
        }
      });

    } catch (error) {
      console.error('Error in generateAssessment controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Get assessment by ID
   * GET /api/assessment/:id
   */
  async getAssessment(req, res) {
    try {
      const { id } = req.params;

      const assessment = await Assessment.findById(id)
        .populate('teacher_id', 'name email')
        .populate('class_id', 'class_name')
        .populate('grade_id', 'grade_name')
        .populate('subject_id', 'subject_name');

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: 'Assessment not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: assessment
      });

    } catch (error) {
      console.error('Error in getAssessment controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Get assessment questions
   * GET /api/assessment/:id/questions
   */
  async getAssessmentQuestions(req, res) {
    try {
      const { id } = req.params;

      const questions = await AssessmentQuestions.findOne({ assessment_id: id });

      if (!questions) {
        return res.status(404).json({
          success: false,
          message: 'Questions not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: questions
      });

    } catch (error) {
      console.error('Error in getAssessmentQuestions controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Get all assessments for a teacher
   * GET /api/assessment/teacher/:teacherId
   */
  async getTeacherAssessments(req, res) {
    try {
      const { teacherId } = req.params;
      const { status, subject_id, grade_id } = req.query;

      const filter = { teacher_id: teacherId };
      
      if (status) filter.status = status;
      if (subject_id) filter.subject_id = subject_id;
      if (grade_id) filter.grade_id = grade_id;

      const assessments = await Assessment.find(filter)
        .populate('class_id', 'class_name')
        .populate('grade_id', 'grade_name')
        .populate('subject_id', 'subject_name')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: assessments.length,
        data: assessments
      });

    } catch (error) {
      console.error('Error in getTeacherAssessments controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Update assessment status
   * PATCH /api/assessment/:id/status
   */
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['Draft', 'Scheduled', 'Active', 'Closed', 'Graded'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const assessment = await Assessment.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: 'Assessment not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Status updated successfully',
        data: assessment
      });

    } catch (error) {
      console.error('Error in updateStatus controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = assessmentController;
