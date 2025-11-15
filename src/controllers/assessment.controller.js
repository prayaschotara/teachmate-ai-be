const AssessmentGeneratorAgent = require('../agents/assessmentGeneratorAgent');
const Assessment = require('../models/Assessment.model');
const AssessmentQuestions = require('../models/AssessmentQuestions.model');
const Submission = require('../models/Submission.model');
const Student = require('../models/Student.model');

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
  },

  /**
   * Get active assessments for students by class
   * GET /api/assessment/student/class/:classId
   */
  async getActiveAssessmentsByClass(req, res) {
    try {
      const { classId } = req.params;
      const studentId = req.user.id; // Get student ID from authenticated user

      const assessments = await Assessment.find({
        class_id: classId,
        status: 'Active',
        isActive: true
      })
        .populate('teacher_id', 'name')
        .populate('subject_id', 'subject_name')
        .populate('grade_id', 'grade_name')
        .sort({ opens_on: -1 })
        .lean(); // Use lean() for better performance

      // Check submission status for each assessment
      const assessmentsWithStatus = await Promise.all(
        assessments.map(async (assessment) => {
          const submission = await Submission.findOne({
            assessment_id: assessment._id,
            student_id: studentId
          }).select('status submitted_at total_marks_obtained percentage');

          return {
            ...assessment,
            submission_status: submission ? {
              has_submitted: true,
              status: submission.status,
              submitted_at: submission.submitted_at,
              total_marks_obtained: submission.total_marks_obtained,
              percentage: submission.percentage
            } : {
              has_submitted: false,
              status: 'Pending'
            }
          };
        })
      );

      return res.status(200).json({
        success: true,
        count: assessmentsWithStatus.length,
        data: assessmentsWithStatus
      });

    } catch (error) {
      console.error('Error in getActiveAssessmentsByClass controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Get active assessments for students by grade
   * GET /api/assessment/student/grade/:gradeId
   */
  async getActiveAssessmentsByGrade(req, res) {
    try {
      const { gradeId } = req.params;
      const studentId = req.user.id; // Get student ID from authenticated user

      const assessments = await Assessment.find({
        grade_id: gradeId,
        status: 'Active',
        isActive: true
      })
        .populate('teacher_id', 'name')
        .populate('subject_id', 'subject_name')
        .populate('class_id', 'class_name')
        .sort({ opens_on: -1 })
        .lean(); // Use lean() for better performance

      // Check submission status for each assessment
      const assessmentsWithStatus = await Promise.all(
        assessments.map(async (assessment) => {
          const submission = await Submission.findOne({
            assessment_id: assessment._id,
            student_id: studentId
          }).select('status submitted_at total_marks_obtained percentage');

          return {
            ...assessment,
            submission_status: submission ? {
              has_submitted: true,
              status: submission.status,
              submitted_at: submission.submitted_at,
              total_marks_obtained: submission.total_marks_obtained,
              percentage: submission.percentage
            } : {
              has_submitted: false,
              status: 'Pending'
            }
          };
        })
      );

      return res.status(200).json({
        success: true,
        count: assessmentsWithStatus.length,
        data: assessmentsWithStatus
      });

    } catch (error) {
      console.error('Error in getActiveAssessmentsByGrade controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  async getStudentPerformance(req, res) {
    try {
      // Get student ID from authenticated user
      const studentId = req.user.id;
      const student = await Student.findById(studentId).select('class grade');

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      const studentClassId = student.class?.class_id;
      const studentGradeId = student.grade?.grade_id;

      if (!studentClassId || !studentGradeId) {
        return res.status(400).json({
          success: false,
          message: 'Student class or grade information not found'
        });
      }

      // Get all assessments for student's class with specific statuses
      const assessments = await Assessment.find({
        class_id: studentClassId,
        grade_id: studentGradeId,
        status: { $in: ['Active', 'Closed', 'Graded'] },
        isActive: true
      }).lean();

      // Get all submissions for this student
      const submissions = await Submission.find({
        student_id: studentId,
        status: 'Graded'
      })
        .populate('assessment_id', 'subject_id total_marks')
        .populate({
          path: 'assessment_id',
          populate: {
            path: 'subject_id',
            select: 'subject_name'
          }
        })
        .lean();
  
      // Calculate overall performance
      const totalAssessments = assessments.length;
      const totalSubmissions = submissions.length
      const totalMarksObtained = submissions.reduce((sum, sub) => sum + (sub.total_marks_obtained || 0), 0);
      const totalMarks = submissions.reduce((sum, sub) => sum + (sub.assessment_id?.total_marks || 0), 0);
      const averagePercentage = totalAssessments > 0
        ? (totalMarksObtained / totalMarks) * 100
        : 0;


      

      // Calculate subject-wise performance
      const subjectWiseMap = {};
      submissions.forEach(submission => {
        const subjectName = submission.assessment_id?.subject_id?.subject_name || 'Unknown';

        if (!subjectWiseMap[subjectName]) {
          subjectWiseMap[subjectName] = {
            total_assessments: 0,
            total_marks: 0,
            marks_obtained: 0,
            percentage: 0
          };
        }

        subjectWiseMap[subjectName].total_assessments += 1;
        subjectWiseMap[subjectName].total_marks += submission.assessment_id?.total_marks || 0;
        subjectWiseMap[subjectName].marks_obtained += submission.total_marks_obtained || 0;
      });

      // Calculate percentage for each subject and convert to array
      const subjectWise = Object.keys(subjectWiseMap).map(subjectName => {
        const data = subjectWiseMap[subjectName];
        const percentage = data.total_marks > 0
          ? (data.marks_obtained / data.total_marks) * 100
          : 0;
        
        return {
          subject_name: subjectName,
          total_assessments: data.total_assessments,
          total_marks: data.total_marks,
          marks_obtained: data.marks_obtained,
          percentage: Math.round(percentage * 10) / 10
        };
      });

      const performanceData = {
        overall: {
          total_assessments: totalAssessments,
          total_submissions: totalSubmissions,
          average_percentage: Math.round(averagePercentage * 10) / 10,
          total_marks_obtained: totalMarksObtained,
          total_marks: totalMarks
        },
        subject_wise: subjectWise,
      };

      return res.status(200).json({
        success: true,
        data: performanceData
      });

    } catch (error) {
      console.error('Error in getStudentPerformance controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Get all assessments for students (with filters)
   * GET /api/assessment/student/all
   */
  async getStudentAssessments(req, res) {
    try {
      const { class_id, grade_id, teacher_id, subject_id, status } = req.query;
      // const studentId = req.user.id; // Get student ID from authenticated user
      const studentId = "6916f7b48ffcc9d6c79313c6" // Get student ID from authenticated user

      const filter = { isActive: true };

      if (class_id) filter.class_id = class_id;
      if (grade_id) filter.grade_id = grade_id;
      if (teacher_id) filter.teacher_id = teacher_id;
      if (subject_id) filter.subject_id = subject_id;
      if (status) filter.status = status;
      else filter.status = 'Active'; // Default to active only

      const assessments = await Assessment.find(filter)
        .populate('teacher_id', 'name')
        .populate('subject_id', 'subject_name')
        .populate('grade_id', 'grade_name')
        .populate('class_id', 'class_name')
        .sort({ opens_on: -1 })
        .lean(); // Use lean() for better performance

      // Check submission status for each assessment
      const assessmentsWithStatus = await Promise.all(
        assessments.map(async (assessment) => {
          const submission = await Submission.findOne({
            assessment_id: assessment._id,
            student_id: studentId
          }).select('status submitted_at total_marks_obtained percentage');

          return {
            ...assessment,
            submission_status: submission ? {
              has_submitted: true,
              status: submission.status,
              submitted_at: submission.submitted_at,
              total_marks_obtained: submission.total_marks_obtained,
              percentage: submission.percentage
            } : {
              has_submitted: false,
              status: 'Pending'
            }
          };
        })
      );

      return res.status(200).json({
        success: true,
        count: assessmentsWithStatus.length,
        data: assessmentsWithStatus
      });

    } catch (error) {
      console.error('Error in getStudentAssessments controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = assessmentController;
