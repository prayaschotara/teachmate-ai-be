const Submission = require('../models/Submission.model');
const Assessment = require('../models/Assessment.model');
const AssessmentQuestions = require('../models/AssessmentQuestions.model');

const submissionController = {
    /**
     * Submit an assessment
     * POST /api/submission/submit
     */
    async submitAssessment(req, res) {
        try {
            const {
                assessment_id,
                student_id,
                answers,
                time_taken
            } = req.body;

            // Validate required fields
            if (!assessment_id || !student_id || !answers || !Array.isArray(answers)) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: assessment_id, student_id, answers (array)'
                });
            }

            // Check if assessment exists and is active
            const assessment = await Assessment.findById(assessment_id);
            if (!assessment) {
                return res.status(404).json({
                    success: false,
                    message: 'Assessment not found'
                });
            }

            if (assessment.status !== 'Active') {
                return res.status(400).json({
                    success: false,
                    message: `Assessment is not active. Current status: ${assessment.status}`
                });
            }

            // Check if student already submitted
            const existingSubmission = await Submission.findOne({
                assessment_id,
                student_id
            });

            if (existingSubmission) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already submitted this assessment'
                });
            }

            // Fetch all questions for this assessment
            const assessmentQuestions = await AssessmentQuestions.findOne({ assessment_id });
            if (!assessmentQuestions || !assessmentQuestions.questions) {
                return res.status(404).json({
                    success: false,
                    message: 'Questions not found for this assessment'
                });
            }

            const questionMap = {};
            assessmentQuestions.questions.forEach(q => {
                questionMap[q.question_id] = q;
            });

            // Process answers without grading - grading agent will handle everything
            const processedAnswers = [];
            let totalMarks = 0;

            for (const answer of answers) {
                const question = questionMap[answer.question_id];
                if (!question) {
                    return res.status(400).json({
                        success: false,
                        message: `Question ${answer.question_id} not found`
                    });
                }

                totalMarks += question.marks;

                // Store answer without grading
                processedAnswers.push({
                    question_id: question.question_id,
                    question_text: question.question,
                    student_answer: answer.student_answer,
                    correct_answer: null, // Will be set by grading agent
                    marks_obtained: 0, // Will be set by grading agent
                    max_marks: question.marks,
                    is_correct: false // Will be set by grading agent
                });
            }

            // Create submission without grading
            const submission = new Submission({
                assessment_id,
                student_id,
                answers: processedAnswers,
                total_marks_obtained: 0, // Will be calculated by grading agent
                total_marks: totalMarks,
                percentage: 0, // Will be calculated by grading agent
                status: 'Submitted',
                time_taken: time_taken || 0
            });

            await submission.save();

            return res.status(201).json({
                success: true,
                message: 'Assessment submitted successfully. Grading will be done by AI agent.',
                data: submission
            });

        } catch (error) {
            console.error('Error in submitAssessment controller:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    },

    /**
     * Get submission by ID
     * GET /api/submission/:id
     */
    async getSubmission(req, res) {
        try {
            const { id } = req.params;

            const submission = await Submission.findById(id)
                .populate('assessment_id', 'title subject_name grade_name')
                .populate('student_id', 'name email');

            if (!submission) {
                return res.status(404).json({
                    success: false,
                    message: 'Submission not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: submission
            });

        } catch (error) {
            console.error('Error in getSubmission controller:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    },

    /**
     * Get all submissions for an assessment
     * GET /api/submission/assessment/:assessmentId
     */
    async getAssessmentSubmissions(req, res) {
        try {
            const { assessmentId } = req.params;
            const { status } = req.query;

            const filter = { assessment_id: assessmentId };
            if (status) filter.status = status;

            const submissions = await Submission.find(filter)
                .populate('student_id', 'name email roll_number')
                .sort({ submitted_at: -1 });

            return res.status(200).json({
                success: true,
                count: submissions.length,
                data: submissions
            });

        } catch (error) {
            console.error('Error in getAssessmentSubmissions controller:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    },

    /**
     * Get all submissions by a student
     * GET /api/submission/student/:studentId
     */
    async getStudentSubmissions(req, res) {
        try {
            const { studentId } = req.params;
            const { status } = req.query;

            const filter = { student_id: studentId };
            if (status) filter.status = status;

            const submissions = await Submission.find(filter)
                .populate('assessment_id', 'title subject_name grade_name total_marks')
                .sort({ submitted_at: -1 });

            return res.status(200).json({
                success: true,
                count: submissions.length,
                data: submissions
            });

        } catch (error) {
            console.error('Error in getStudentSubmissions controller:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    },

    /**
     * Get ungraded submissions (for AI grading agent)
     * GET /api/submission/ungraded
     */
    async getUngradedSubmissions(req, res) {
        try {
            const submissions = await Submission.find({
                status: 'Submitted'
            })
                .populate('assessment_id', 'title subject_name grade_name')
                .populate('student_id', 'name')
                .sort({ submitted_at: 1 }); // Oldest first

            return res.status(200).json({
                success: true,
                count: submissions.length,
                data: submissions
            });

        } catch (error) {
            console.error('Error in getUngradedSubmissions controller:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    },

    /**
     * Check submission status for a student and assessment
     * GET /api/submission/status/:assessmentId/:studentId
     */
    async checkSubmissionStatus(req, res) {
        try {
            const { assessmentId, studentId } = req.params;

            const submission = await Submission.findOne({
                assessment_id: assessmentId,
                student_id: studentId
            });

            if (!submission) {
                return res.status(200).json({
                    success: true,
                    data: {
                        submitted: false,
                        submission: null
                    }
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    submitted: true,
                    submission: {
                        _id: submission._id,
                        status: submission.status,
                        submitted_at: submission.submitted_at,
                        total_marks_obtained: submission.total_marks_obtained,
                        total_marks: submission.total_marks,
                        percentage: submission.percentage
                    }
                }
            });

        } catch (error) {
            console.error('Error in checkSubmissionStatus controller:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    },

    /**
     * Manually trigger grading process (for testing)
     * POST /api/submission/grade/trigger
     */
    async triggerManualGrading(req, res) {
        try {
            const submissionGradingScheduler = require('../services/submissionGradingScheduler.service');

            // Trigger grading in background
            submissionGradingScheduler.triggerManualGrading().catch(error => {
                console.error('Background grading error:', error);
            });

            return res.status(200).json({
                success: true,
                message: 'Grading process triggered. Check server logs for progress.'
            });

        } catch (error) {
            console.error('Error triggering manual grading:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
};

module.exports = submissionController;
