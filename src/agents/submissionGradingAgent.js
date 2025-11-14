const Submission = require('../models/Submission.model');
const AssessmentQuestions = require('../models/AssessmentQuestions.model');
const { default: axios } = require('axios');
const { configDotenv } = require('dotenv');
configDotenv()

class SubmissionGradingAgent {
    constructor() {
        this.openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.openrouterKey = process.env.OPENROUTER_API_KEY;
        this.model = 'openai/gpt-4o-mini'; // Using a valid OpenRouter model
    }

    /**
     * Grade a single subjective answer using AI
     */
    async gradeSubjectiveAnswer(question, studentAnswer, maxMarks) {
        const prompt = `You are an expert CBSE teacher grading a student's answer.

QUESTION:
${question.question_text}

EXPECTED ANSWER:
${question.correct_answer}

STUDENT'S ANSWER:
${studentAnswer}

MAXIMUM MARKS: ${maxMarks}

GRADING CRITERIA:
- If the answer is >= 90% accurate: Award FULL marks (${maxMarks})
- If the answer is >= 50% accurate but < 90%: Award HALF marks (${maxMarks / 2})
- If the answer is < 50% accurate: Award 0 marks

Evaluate the student's answer based on:
1. Correctness of key concepts
2. Completeness of the answer
3. Clarity and coherence
4. Relevance to the question

Respond ONLY with valid JSON in this exact format:
{
  "marks": <number>,
  "accuracy_percentage": <number>,
  "feedback": "<brief feedback explaining the marks>"
}`;

        try {
            const response = await axios.post(
                this.openrouterUrl,
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert CBSE teacher. Always respond with valid JSON only.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.openrouterKey}`,
                        'HTTP-Referer': 'http://localhost',
                        'X-Title': 'TeachMate AI',
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const content = response.data.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error('No valid JSON found in AI response');
            }

            const result = JSON.parse(jsonMatch[0]);

            // Validate marks based on criteria
            if (result.accuracy_percentage >= 90) {
                result.marks = maxMarks;
            } else if (result.accuracy_percentage >= 50) {
                result.marks = maxMarks / 2;
            } else {
                result.marks = 0;
            }

            return result;

        } catch (error) {
            console.log(error)
            console.error('Error grading answer:', error.response?.data || error.message);
            throw new Error('Failed to grade answer with AI');
        }
    }

    /**
     * Grade a single submission
     */
    async gradeSubmission(submissionId) {
        try {
            console.log(`\n📝 Grading submission: ${submissionId}`);

            // Fetch submission
            const submission = await Submission.findById(submissionId)
                .populate('assessment_id', 'title')
            // .populate('student_id', 'name');

            if (!submission) {
                throw new Error('Submission not found');
            }

            if (submission.status !== 'Submitted') {
                console.log(`⏭️  Skipping - already ${submission.status}`);
                return { skipped: true, reason: `Already ${submission.status}` };
            }

            // Update status to Grading
            submission.status = 'Grading';
            await submission.save();

            console.log(`  Student: ${submission.student_id.name}`);
            console.log(`  Assessment: ${submission.assessment_id.title}`);

            // Fetch assessment questions
            const assessmentQuestions = await AssessmentQuestions.findOne({
                assessment_id: submission.assessment_id._id
            });

            if (!assessmentQuestions) {
                throw new Error('Assessment questions not found');
            }

            // Create question map
            const questionMap = {};
            assessmentQuestions.questions.forEach(q => {
                questionMap[q.question_id] = q;
            });

            let totalMarksObtained = 0;
            const gradingNotes = [];

            // Grade each answer
            for (let i = 0; i < submission.answers.length; i++) {
                const answer = submission.answers[i];
                const question = questionMap[answer.question_id];

                if (!question) {
                    console.log(`  ⚠️  Question ${answer.question_id} not found`);
                    continue;
                }

                // // Skip if already graded (MCQ/True-False)
                // if (answer.marks_obtained > 0 || question.input_type === 'MCQ' || question.input_type === 'True/False') {
                //     totalMarksObtained += answer.marks_obtained;
                //     console.log(`  ✓ Q${i + 1} (${question.input_type}): ${answer.marks_obtained}/${answer.max_marks} marks (auto-graded)`);
                //     continue;
                // }

                // Grade subjective questions
                console.log(`  🤖 Grading Q${i + 1} (${question.input_type})...`);

                try {
                    const gradingResult = await this.gradeSubjectiveAnswer(
                        {
                            question_text: answer.question_text,
                            correct_answer: question.answers[0]?.option || 'No expected answer provided'
                        },
                        answer.student_answer,
                        answer.max_marks
                    );

                    // Update answer with grading results
                    submission.answers[i].marks_obtained = gradingResult.marks;
                    submission.answers[i].is_correct = gradingResult.marks === answer.max_marks;
                    submission.answers[i].ai_feedback = gradingResult.feedback;

                    totalMarksObtained += gradingResult.marks;

                    console.log(`    ✓ Awarded: ${gradingResult.marks}/${answer.max_marks} marks (${gradingResult.accuracy_percentage}% accurate)`);
                    console.log(`    💬 Feedback: ${gradingResult.feedback}`);

                    gradingNotes.push(`Q${i + 1}: ${gradingResult.accuracy_percentage}% accurate - ${gradingResult.feedback}`);

                } catch (error) {
                    console.error(`    ❌ Error grading Q${i + 1}:`, error.message);
                    gradingNotes.push(`Q${i + 1}: Grading failed - ${error.message}`);
                }
            }

            // Update submission with final results
            submission.total_marks_obtained = totalMarksObtained;
            submission.percentage = submission.total_marks > 0
                ? (totalMarksObtained / submission.total_marks) * 100
                : 0;
            submission.status = 'Graded';
            submission.graded_at = new Date();
            submission.ai_grading_notes = gradingNotes.join('\n');

            await submission.save();

            console.log(`  ✅ Grading complete: ${totalMarksObtained}/${submission.total_marks} marks (${submission.percentage.toFixed(2)}%)`);

            return {
                success: true,
                submission_id: submissionId,
                student_name: submission.student_id.name,
                marks: `${totalMarksObtained}/${submission.total_marks}`,
                percentage: submission.percentage.toFixed(2)
            };

        } catch (error) {
            console.log(error)
            console.error(`❌ Error grading submission ${submissionId}:`, error.message);

            // Reset status if grading failed
            try {
                await Submission.findByIdAndUpdate(submissionId, { status: 'Submitted' });
            } catch (updateError) {
                console.error('Failed to reset submission status:', updateError.message);
            }

            return {
                success: false,
                submission_id: submissionId,
                error: error.message
            };
        }
    }

    /**
     * Grade all ungraded submissions
     */
    async gradeAllUngraded() {
        try {
            console.log('\n🎯 Starting batch grading process...');

            // Fetch all ungraded submissions
            const submissions = await Submission.find({ status: 'Submitted' })
                .populate('student_id', 'name')
                .populate('assessment_id', 'title')
                .sort({ submitted_at: 1 }); // Oldest first

            if (submissions.length === 0) {
                console.log('✓ No ungraded submissions found');
                return {
                    success: true,
                    message: 'No ungraded submissions',
                    graded: 0
                };
            }

            console.log(`📋 Found ${submissions.length} submission(s) to grade\n`);

            const results = [];

            // Grade each submission
            for (const submission of submissions) {
                const result = await this.gradeSubmission(submission._id);
                results.push(result);

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            console.log(`\n✅ Batch grading complete:`);
            console.log(`   ✓ Successfully graded: ${successful}`);
            if (failed > 0) {
                console.log(`   ✗ Failed: ${failed}`);
            }

            return {
                success: true,
                total: submissions.length,
                graded: successful,
                failed: failed,
                results: results
            };

        } catch (error) {
            console.error('❌ Error in batch grading:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = SubmissionGradingAgent;
