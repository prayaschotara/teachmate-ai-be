const { Pinecone } = require('@pinecone-database/pinecone');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Assessment = require('../models/Assessment.model');
const AssessmentQuestions = require('../models/AssessmentQuestions.model');
const LessonPlan = require('../models/LessonPlan.model');

class AssessmentGeneratorAgent {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    this.index = this.pinecone.index('teachmate-resources');
    
    this.openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.model = 'anthropic/claude-3.5-sonnet';

    // Question structure for 20 marks
    this.questionStructure = {
      mcq: { count: 5, marks: 2 },
      fillInBlank: { count: 2, marks: 1 },
      shortAnswer: { count: 2, marks: 2 },
      longAnswer: { count: 1, marks: 4 }
    };
  }

  /**
   * Query Pinecone for chapter content
   */
  async queryPineconeForTopics(chapterNumber, grade, topics) {
    try {
      // Create query from topics
      const queryText = topics.join(' ');
      
      // Generate embedding
      const embeddingResponse = await axios.post(
        'https://openrouter.ai/api/v1/embeddings',
        {
          model: 'openai/text-embedding-3-small',
          input: queryText
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openrouterKey}`,
            'HTTP-Referer': 'http://localhost',
            'X-Title': 'TeachMate AI'
          }
        }
      );

      const embedding = embeddingResponse.data.data[0].embedding;

      // Query Pinecone
      const results = await this.index.query({
        vector: embedding,
        topK: 100,
        filter: {
          subject: 'Science',
          grade: grade,
          chapter: chapterNumber.toString()
        },
        includeMetadata: true
      });

      return results.matches || [];
    } catch (error) {
      console.error('Error querying Pinecone:', error);
      throw new Error('Failed to retrieve content from database');
    }
  }

  /**
   * Prepare context from Pinecone chunks
   */
  prepareContext(chunks) {
    // Group by content type
    const exercises = [];
    const examples = [];
    const definitions = [];
    const explanations = [];

    chunks.forEach(chunk => {
      const type = chunk.metadata?.contentType || 'explanation';
      const text = chunk.metadata?.textPreview || '';
      const section = chunk.metadata?.section || '';
      
      const content = { text, section };

      switch(type) {
        case 'exercise':
          exercises.push(content);
          break;
        case 'example':
          examples.push(content);
          break;
        case 'definition':
          definitions.push(content);
          break;
        default:
          explanations.push(content);
      }
    });

    return {
      exercises: exercises.slice(0, 10),
      examples: examples.slice(0, 10),
      definitions: definitions.slice(0, 10),
      explanations: explanations.slice(0, 10),
      topic: chunks[0]?.metadata?.topic || 'Unknown'
    };
  }

  /**
   * Generate assessment questions using LLM
   */
  async generateQuestions(context, topics) {
    const prompt = this.buildPrompt(context, topics);

    try {
      const response = await axios.post(
        this.openrouterUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert CBSE teacher creating assessment questions. Generate questions ONLY from the provided textbook content. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openrouterKey}`,
            'HTTP-Referer': 'http://localhost',
            'X-Title': 'TeachMate AI',
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No valid JSON found in LLM response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error calling OpenRouter:', error.response?.data || error.message);
      throw new Error('Failed to generate questions');
    }
  }

  /**
   * Build prompt for LLM
   */
  buildPrompt(context, topics) {
    return `Generate assessment questions based ONLY on the following textbook content.

TOPICS TO ASSESS:
${topics.join(', ')}

TEXTBOOK CONTENT:

Definitions:
${context.definitions.map(d => d.text).join('\n\n').substring(0, 1000)}

Explanations:
${context.explanations.map(e => e.text).join('\n\n').substring(0, 1500)}

Examples:
${context.examples.map(e => e.text).join('\n\n').substring(0, 1000)}

REQUIREMENTS:
Generate exactly 10 questions with the following distribution:

1. 5 MCQ questions (2 marks each)
   - 4 options each
   - Mark correct answer
   - Mix of easy and medium difficulty

2. 2 Fill in the Blank questions (1 mark each)
   - Single word or short phrase answer
   - Easy difficulty

3. 2 Short Answer questions (2 marks each)
   - 2-3 sentence answers
   - Medium difficulty

4. 1 Long Answer question (4 marks)
   - Detailed explanation required
   - Hard difficulty

IMPORTANT RULES:
- Questions MUST be answerable from the given textbook content
- Do NOT add external information
- Include section reference where content is from
- Ensure questions test understanding, not just memorization

OUTPUT FORMAT (JSON only):
{
  "questions": [
    {
      "question": "Question text here",
      "input_type": "MCQ",
      "answers": [
        {"option": "Option A", "is_correct": true, "explanation": "Why this is correct"},
        {"option": "Option B", "is_correct": false, "explanation": ""},
        {"option": "Option C", "is_correct": false, "explanation": ""},
        {"option": "Option D", "is_correct": false, "explanation": ""}
      ],
      "marks": 2,
      "difficulty": "Easy",
      "topic": "Topic name"
    },
    {
      "question": "Fill in the blank: _____ is the process...",
      "input_type": "Fill in the Blank",
      "answers": [
        {"option": "Photosynthesis", "is_correct": true, "explanation": ""}
      ],
      "marks": 1,
      "difficulty": "Easy",
      "topic": "Topic name"
    },
    {
      "question": "Short answer question?",
      "input_type": "Short Answer",
      "answers": [
        {"option": "Expected answer points", "is_correct": true, "explanation": ""}
      ],
      "marks": 2,
      "difficulty": "Medium",
      "topic": "Topic name"
    },
    {
      "question": "Long answer question?",
      "input_type": "Long Answer",
      "answers": [
        {"option": "Expected answer outline", "is_correct": true, "explanation": ""}
      ],
      "marks": 4,
      "difficulty": "Hard",
      "topic": "Topic name"
    }
  ]
}`;
  }

  /**
   * Save assessment to database
   */
  async saveAssessment(assessmentData, questionsData, input) {
    try {
      // Create Assessment
      const assessment = new Assessment({
        title: assessmentData.title,
        opens_on: new Date(input.opens_on),
        due_date: new Date(input.due_date),
        status: 'Draft',
        class_id: input.class_id,
        grade_id: input.grade_id,
        grade_name: input.grade_name,
        subject_id: input.subject_id,
        subject_name: input.subject_name,
        topics: input.topics,
        teacher_id: input.teacher_id,
        total_marks: 20,
        duration: input.duration || 30,
        instructions: 'Answer all questions. Total marks: 20'
      });

      await assessment.save();

      // Add question_id to each question
      const questionsWithIds = questionsData.questions.map((q, idx) => ({
        question_id: uuidv4(),
        question: q.question,
        input_type: q.input_type,
        answers: q.answers || [],
        marks: q.marks,
        difficulty: q.difficulty,
        topic: q.topic,
        order: idx + 1
      }));

      // Create AssessmentQuestions
      const assessmentQuestions = new AssessmentQuestions({
        assessment_id: assessment._id,
        questions: questionsWithIds,
        class_id: input.class_id,
        subject_id: input.subject_id,
        grade_id: input.grade_id,
        total_marks: 20
      });

      await assessmentQuestions.save();

      return {
        assessment,
        assessmentQuestions
      };
    } catch (error) {
      console.error('Error saving assessment:', error);
      throw new Error('Failed to save assessment to database');
    }
  }

  /**
   * Link assessment to lesson plan
   */
  async linkToLessonPlan(lessonPlanId, assessmentId, sessionNumber = null) {
    try {
      const lessonPlan = await LessonPlan.findById(lessonPlanId);
      
      if (!lessonPlan) {
        throw new Error('Lesson plan not found');
      }

      if (sessionNumber) {
        // Session-wise assessment
        const session = lessonPlan.session_details.find(s => s.session_number === sessionNumber);
        if (session) {
          session.assessment.push(assessmentId);
        }
      } else {
        // Chapter-wise assessment
        lessonPlan.chapter_wise_assessment.push(assessmentId);
      }

      await lessonPlan.save();
      return lessonPlan;
    } catch (error) {
      console.error('Error linking assessment:', error);
      throw new Error('Failed to link assessment to lesson plan');
    }
  }

  /**
   * Main method to generate assessment
   */
  async generate(input) {
    try {
      console.log('🎯 Starting assessment generation...');

      // Validate input
      if (!input.lesson_plan_id || !input.assessment_type) {
        throw new Error('lesson_plan_id and assessment_type are required');
      }

      // Fetch lesson plan
      const lessonPlan = await LessonPlan.findById(input.lesson_plan_id);
      if (!lessonPlan) {
        throw new Error('Lesson plan not found');
      }

      // Get topics based on assessment type
      let topics = [];
      let title = '';

      if (input.assessment_type === 'session') {
        if (!input.session_number) {
          throw new Error('session_number required for session assessment');
        }
        const session = lessonPlan.session_details.find(s => s.session_number === input.session_number);
        if (!session) {
          throw new Error('Session not found');
        }
        topics = session.topics_covered;
        title = `Session ${input.session_number} Assessment - ${lessonPlan.chapter_name}`;
      } else {
        // Chapter-wise: get all topics from all sessions
        lessonPlan.session_details.forEach(session => {
          topics = topics.concat(session.topics_covered);
        });
        title = `Chapter Assessment - ${lessonPlan.chapter_name}`;
      }

      // Enrich input
      input.topics = topics;
      input.grade_name = lessonPlan.grade_name;
      input.subject_name = lessonPlan.subject_name;
      input.teacher_id = lessonPlan.teacher_id;

      console.log(`📚 Topics to assess: ${topics.join(', ')}`);

      // Query Pinecone
      console.log('🔍 Querying Pinecone for content...');
      const chunks = await this.queryPineconeForTopics(
        lessonPlan.chapter_number,
        parseInt(lessonPlan.grade_name),
        topics
      );

      if (chunks.length === 0) {
        throw new Error('No content found for these topics');
      }

      console.log(`✓ Found ${chunks.length} content chunks`);

      // Prepare context
      const context = this.prepareContext(chunks);

      // Generate questions
      console.log('🤖 Generating questions with AI...');
      const questionsData = await this.generateQuestions(context, topics);

      console.log(`✓ Generated ${questionsData.questions.length} questions`);

      // Save to database
      console.log('💾 Saving assessment...');
      const saved = await this.saveAssessment(
        { title },
        questionsData,
        input
      );

      // Link to lesson plan
      console.log('🔗 Linking to lesson plan...');
      await this.linkToLessonPlan(
        input.lesson_plan_id,
        saved.assessment._id,
        input.session_number
      );

      console.log('✅ Assessment generated successfully!');

      return {
        success: true,
        assessment: saved.assessment,
        questions: saved.assessmentQuestions
      };

    } catch (error) {
      console.error('❌ Error in assessment generation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AssessmentGeneratorAgent;
