const ContentCurationAgent = require('../agents/contentCurationAgent');
const AssessmentGeneratorAgent = require('../agents/assessmentGeneratorAgent');
const LessonPlan = require('../models/LessonPlan.model');

class AgentWorkflowService {
    /**
     * Trigger content curation after lesson plan creation
     */
    static async triggerContentCuration(lessonPlanId) {
        try {
            console.log('🔄 Workflow: Triggering content curation...');

            const lessonPlan = await LessonPlan.findById(lessonPlanId);
            if (!lessonPlan) {
                throw new Error('Lesson plan not found');
            }

            // Extract all topics from session details
            const topics = [];
            lessonPlan.session_details.forEach(session => {
                topics.push(...session.topics_covered);
            });

            // Remove duplicates
            const uniqueTopics = [...new Set(topics)];

            // Initialize content curation agent
            const agent = new ContentCurationAgent();

            // Curate content
            const result = await agent.curate({
                lesson_plan_id: lessonPlanId,
                subject: lessonPlan.subject_name,
                grade: lessonPlan.grade_name,
                topics: uniqueTopics,
                save_to_db: true
            });

            if (!result.success) {
                console.error('❌ Content curation failed:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Content curation completed successfully');
            return {
                success: true,
                videos: result.videos,
                simulations: result.simulations
            };

        } catch (error) {
            console.error('❌ Error in content curation workflow:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Trigger assessment generation when lesson plan is marked as completed
     */
    static async triggerAssessmentGeneration(lessonPlanId, assessmentConfig = {}) {
        try {
            console.log('🔄 Workflow: Triggering assessment generation...');

            const lessonPlan = await LessonPlan.findById(lessonPlanId);
            if (!lessonPlan) {
                throw new Error('Lesson plan not found');
            }

            // Check if lesson plan is completed
            if (lessonPlan.status !== 'Completed') {
                return {
                    success: false,
                    error: 'Lesson plan must be marked as Completed to generate assessments'
                };
            }

            // Initialize assessment generator agent
            const agent = new AssessmentGeneratorAgent();

            // Generate chapter-wise assessment
            const result = await agent.generate({
                lesson_plan_id: lessonPlanId,
                assessment_type: 'chapter',
                class_id: assessmentConfig.class_id,
                grade_id: lessonPlan.grade_id,
                subject_id: lessonPlan.subject_id,
                opens_on: assessmentConfig.opens_on || new Date(),
                due_date: assessmentConfig.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                duration: assessmentConfig.duration || 30
            });

            if (!result.success) {
                console.error('❌ Assessment generation failed:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Assessment generation completed successfully');
            return {
                success: true,
                assessment: result.assessment,
                questions: result.questions
            };

        } catch (error) {
            console.error('❌ Error in assessment generation workflow:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Trigger session-wise assessment generation when a session is completed
     */
    static async triggerSessionAssessment(lessonPlanId, sessionNumber, assessmentConfig = {}) {
        try {
            console.log(`🔄 Workflow: Triggering session ${sessionNumber} assessment generation...`);

            const lessonPlan = await LessonPlan.findById(lessonPlanId);
            if (!lessonPlan) {
                throw new Error('Lesson plan not found');
            }

            const session = lessonPlan.session_details.find(s => s.session_number === sessionNumber);
            if (!session) {
                throw new Error(`Session ${sessionNumber} not found`);
            }

            if (session.status !== 'Completed') {
                return {
                    success: false,
                    error: `Session ${sessionNumber} must be marked as Completed to generate assessment`
                };
            }

            // Initialize assessment generator agent
            const agent = new AssessmentGeneratorAgent();

            // Generate session-wise assessment
            const result = await agent.generate({
                lesson_plan_id: lessonPlanId,
                assessment_type: 'session',
                session_number: sessionNumber,
                class_id: assessmentConfig.class_id,
                grade_id: lessonPlan.grade_id,
                subject_id: lessonPlan.subject_id,
                opens_on: assessmentConfig.opens_on || new Date(),
                due_date: assessmentConfig.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                duration: assessmentConfig.duration || 30
            });

            if (!result.success) {
                console.error(`❌ Session ${sessionNumber} assessment generation failed:`, result.error);
                return { success: false, error: result.error };
            }

            console.log(`✅ Session ${sessionNumber} assessment generated successfully`);
            return {
                success: true,
                assessment: result.assessment,
                questions: result.questions
            };

        } catch (error) {
            console.error(`❌ Error in session ${sessionNumber} assessment workflow:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Complete workflow: Generate lesson plan -> Curate content -> Generate assessment
     */
    static async executeCompleteWorkflow(lessonPlanId, assessmentConfig = {}) {
        try {
            console.log('🚀 Starting complete agent workflow...');

            const results = {
                lessonPlan: null,
                contentCuration: null,
                assessment: null
            };

            // Step 1: Get lesson plan
            const lessonPlan = await LessonPlan.findById(lessonPlanId);
            if (!lessonPlan) {
                throw new Error('Lesson plan not found');
            }
            results.lessonPlan = lessonPlan;
            console.log('✓ Lesson plan loaded');

            // Step 2: Curate content
            const curationResult = await this.triggerContentCuration(lessonPlanId);
            results.contentCuration = curationResult;

            if (!curationResult.success) {
                console.warn('⚠️ Content curation failed, continuing...');
            }

            // Step 3: Generate assessment (only if lesson plan is completed)
            if (lessonPlan.status === 'Completed') {
                const assessmentResult = await this.triggerAssessmentGeneration(lessonPlanId, assessmentConfig);
                results.assessment = assessmentResult;

                if (!assessmentResult.success) {
                    console.warn('⚠️ Assessment generation failed');
                }
            } else {
                console.log('ℹ️ Lesson plan not completed yet, skipping assessment generation');
            }

            console.log('✅ Workflow completed');
            return {
                success: true,
                results
            };

        } catch (error) {
            console.error('❌ Error in complete workflow:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = AgentWorkflowService;
