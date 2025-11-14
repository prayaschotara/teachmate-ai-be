const { Pinecone } = require('@pinecone-database/pinecone');
const axios = require('axios');
const LessonPlan = require('../models/LessonPlan.model');
const Chapter = require('../models/Chapters.model');
const Subject = require('../models/Subject.model');
const Grade = require('../models/Grade.model');

class LessonPlanningAgent {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    this.index = this.pinecone.index('teachmate-resources');

    this.openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.model = 'anthropic/claude-3.5-sonnet';  // Best for structured output
  }

  /**
   * Query Pinecone for chapter content using all required inputs
   */
  async queryPineconeForContent(grade, subject, chapter, sessions) {
    try {
      // Create comprehensive query text using all inputs
      const queryText = `${subject} ${chapter} grade ${grade} education learning teaching curriculum ${sessions} sessions`;

      console.log(`🔍 Pinecone Query: "${queryText}"`);

      // Generate embedding for the query
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

      // Build comprehensive filter using all available information
      const filter = {
        grade: parseInt(grade)
      };

      // Add subject filter
      if (subject) {
        if (subject === "English") { // patch to filter with pinecone metadata strict case sensitivity
          subject = subject.toLowerCase()
        }
        filter.subject = subject;
      }

      // Try to match chapter by name or topic
      if (chapter) {
        // Use $or to match either chapter field or topic field
        filter.$or = [
          { chapter: chapter },
          { topic: chapter },
          { chapter_name: chapter }
        ];
      }

      console.log('📊 Pinecone Filter:', JSON.stringify(filter, null, 2));

      // Query Pinecone with the embedding and comprehensive filter
      const results = await this.index.query({
        vector: embedding,
        topK: 200,  // Get up to 200 chunks
        filter: filter,
        includeMetadata: true
      });

      console.log(`✅ Pinecone returned ${results.matches?.length || 0} matches`);

      // If no results with strict filter, try broader search
      if (!results.matches || results.matches.length === 0) {
        console.log('🔄 Trying broader search without chapter filter...');

        const broaderFilter = {
          grade: parseInt(grade),
          subject: subject
        };

        const broaderResults = await this.index.query({
          vector: embedding,
          topK: 100,
          filter: broaderFilter,
          includeMetadata: true
        });

        console.log(`✅ Broader search returned ${broaderResults.matches?.length || 0} matches`);
        return broaderResults.matches || [];
      }

      return results.matches || [];
    } catch (error) {
      console.error('Error querying Pinecone:', error);
      throw new Error('Failed to retrieve chapter content from database');
    }
  }

  /**
   * Prepare context from Pinecone chunks
   */
  prepareContext(chunks) {
    // Group by content type
    const grouped = {
      explanations: [],
      examples: [],
      activities: [],
      exercises: [],
      definitions: []
    };

    chunks.forEach(chunk => {
      const type = chunk.metadata?.contentType || 'explanation';
      const text = chunk.metadata?.textPreview || '';

      if (grouped[type + 's']) {
        grouped[type + 's'].push(text);
      } else {
        grouped.explanations.push(text);
      }
    });

    // Create summary
    const context = {
      totalChunks: chunks.length,
      topic: chunks[0]?.metadata?.topic || 'Unknown',
      explanations: grouped.explanations.slice(0, 10).join('\n\n'),
      examples: grouped.examples.slice(0, 5).join('\n\n'),
      activities: grouped.activities.slice(0, 5).join('\n\n'),
      exercises: grouped.exercises.slice(0, 5).join('\n\n'),
      definitions: grouped.definitions.slice(0, 5).join('\n\n')
    };

    return context;
  }

  /**
   * Generate lesson plan using LLM
   */
  async generateLessonPlan(context, input) {
    const prompt = this.buildPrompt(context, input);

    try {
      const response = await axios.post(
        this.openrouterUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert CBSE curriculum teacher creating detailed lesson plans. Always respond with valid JSON only, no additional text.'
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

      // Extract JSON from response (in case LLM adds extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in LLM response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error calling OpenRouter:', error.response?.data || error.message);
      throw new Error('Failed to generate lesson plan');
    }
  }

  /**
   * Build comprehensive prompt using all required inputs
   */
  buildPrompt(context, input) {
    const curriculumType = this.getCurriculumType(input.subject_name);
    const sessionDuration = input.session_duration || 45;
    const chapterName = input.topic || input.chapter_name || context.topic;

    return `Create a detailed lesson plan using ALL the provided information:

REQUIRED INPUTS (ALL MUST BE USED):
- Grade: ${input.grade_name}
- Subject: ${input.subject_name}
- Chapter: ${chapterName}
- Total Sessions: ${input.sessions}
- Session Duration: ${sessionDuration} minutes
- Curriculum: ${curriculumType}

CHAPTER CONTENT ANALYSIS:
${context.explanations ? context.explanations.substring(0, 2000) : 'No specific content found - use general curriculum knowledge'}

AVAILABLE RESOURCES:
- Examples: ${context.examples ? 'Yes' : 'No'}
- Activities: ${context.activities ? 'Yes' : 'No'}
- Exercises: ${context.exercises ? 'Yes' : 'No'}
- Definitions: ${context.definitions ? 'Yes' : 'No'}
- Total Content Chunks: ${context.totalChunks}

TASK:
Create a comprehensive lesson plan for "${chapterName}" in ${input.subject_name} for Grade ${input.grade_name} that MUST be divided into exactly ${input.sessions} sessions.

Each session MUST include:
1. Clear learning objectives aligned with ${curriculumType} Grade ${input.grade_name} standards
2. Specific topics from "${chapterName}" to be covered
3. Detailed teaching flow with time slots (total ${sessionDuration} minutes per session)
4. Interactive activities and engagement strategies appropriate for Grade ${input.grade_name}

CRITICAL REQUIREMENTS:
- Use Grade ${input.grade_name} appropriate language and concepts
- Ensure all ${input.sessions} sessions cover different aspects of "${chapterName}"
- Each session must be exactly ${sessionDuration} minutes
- Progressive difficulty across all ${input.sessions} sessions
- Include ${input.subject_name}-specific teaching methodologies
- Align with ${curriculumType} curriculum standards

OUTPUT FORMAT (JSON only, no other text):
{
  "session_details": [
    {
      "session_number": 1,
      "learning_objectives": ["Grade ${input.grade_name} appropriate objective 1", "objective 2"],
      "topics_covered": ["${chapterName} topic 1", "topic 2"],
      "teaching_flow": [
        {
          "time_slot": "0-10 min",
          "activity": "Introduction to ${chapterName}",
          "description": "Grade ${input.grade_name} appropriate description"
        }
      ]
    }
  ],
  "overall_objectives": ["Overall ${chapterName} objectives for Grade ${input.grade_name}"],
  "prerequisites": ["Prerequisites for ${chapterName} in Grade ${input.grade_name}"],
  "learning_outcomes": ["Expected outcomes after ${input.sessions} sessions of ${chapterName}"]
}

NOTE: Do NOT include assessment or recommended_videos fields. They will be added later by other agents.`;
  }

  /**
   * Get curriculum type based on subject
   */
  getCurriculumType(subject) {
    const curriculumMap = {
      'Science': 'CBSE Science',
      'Mathematics': 'CBSE Mathematics',
      'English': 'CBSE English',
    };

    return curriculumMap[subject] || 'CBSE General';
  }

  /**
   * Save lesson plan to database
   */
  async saveLessonPlan(planData, input) {
    try {
      // Clean session details - ensure assessment is empty array
      const cleanedSessionDetails = planData.session_details.map(session => ({
        session_number: session.session_number,
        learning_objectives: session.learning_objectives,
        topics_covered: session.topics_covered,
        teaching_flow: session.teaching_flow,
        resources: null,
        assessment: []  // Empty array - will be populated by Agent 3
      }));

      const lessonPlan = new LessonPlan({
        teacher_id: input.teacher_id,
        subject_id: input.subject_id,
        subject_name: input.subject_name,
        grade_id: input.grade_id,
        grade_name: input.grade_name,
        chapter_id: input.chapter_id,
        chapter_name: input.chapter_name || input.topic,
        chapter_number: input.chapter_number || 1,
        total_sessions: input.sessions,
        session_duration: input.session_duration || 45,
        session_details: cleanedSessionDetails,
        chapter_wise_assessment: [],
        recommended_videos: [],  // Will be populated by Agent 2
        overall_objectives: planData.overall_objectives,
        prerequisites: planData.prerequisites || [],
        learning_outcomes: planData.learning_outcomes,
        status: 'Draft'
      });

      await lessonPlan.save();
      return lessonPlan;
    } catch (error) {
      console.error('Error saving lesson plan:', error);
      throw new Error('Failed to save lesson plan to database');
    }
  }

  /**
   * Generate lesson plan preview without saving (for testing/preview)
   */
  async generatePreview(input) {
    try {
      const result = await this.generate({
        ...input,
        // Remove IDs to prevent saving
        teacher_id: null,
        subject_id: null,
        grade_id: null
      });

      return {
        success: result.success,
        preview: result.lessonPlan,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate input parameters - all 4 required fields
   */
  validateInput(input) {
    const errors = [];

    // Required fields: Grade, Subject, Chapter, Sessions
    if (!input.grade_name && !input.grade_id) {
      errors.push('Grade is required (grade_name or grade_id)');
    }

    if (!input.subject_name && !input.subject_id) {
      errors.push('Subject is required (subject_name or subject_id)');
    }

    if (!input.topic && !input.chapter_name) {
      errors.push('Chapter is required (topic or chapter_name)');
    }

    if (!input.sessions) {
      errors.push('Sessions is required');
    }

    // Validate sessions range
    if (input.sessions && (input.sessions < 1 || input.sessions > 20)) {
      errors.push('Sessions must be between 1 and 20');
    }

    // Validate session duration if provided
    if (input.session_duration && (input.session_duration < 30 || input.session_duration > 120)) {
      errors.push('Session duration must be between 30 and 120 minutes');
    }

    return errors;
  }

  /**
   * Log all inputs for debugging
   */
  logInputs(input) {
    console.log('📋 Input Parameters:');
    console.log('   Grade:', input.grade_name || input.grade_id || 'NOT PROVIDED');
    console.log('   Subject:', input.subject_name || input.subject_id || 'NOT PROVIDED');
    console.log('   Chapter:', input.topic || input.chapter_name || 'NOT PROVIDED');
    console.log('   Sessions:', input.sessions || 'NOT PROVIDED');
    console.log('   Session Duration:', input.session_duration || '45 (default)');
    console.log('   Teacher ID:', input.teacher_id || 'NOT PROVIDED');
    console.log('   Subject ID:', input.subject_id || 'NOT PROVIDED');
    console.log('   Grade ID:', input.grade_id || 'NOT PROVIDED');
    console.log('   Chapter ID:', input.chapter_id || 'NOT PROVIDED');
  }

  /**
   * Main method to generate lesson plan with enhanced validation and flexibility
   */
  async generate(input) {
    try {
      console.log('🎯 Starting lesson plan generation...');

      // Log all inputs for debugging
      this.logInputs(input);

      // Validate input - all 4 required fields
      const validationErrors = this.validateInput(input);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Fetch chapter details (with fallback)
      let chapter, subject, grade;

      try {
        if (input.chapter_id) chapter = await Chapter.findById(input.chapter_id);
        if (input.subject_id) subject = await Subject.findById(input.subject_id);
        if (input.grade_id) grade = await Grade.findById(input.grade_id);
      } catch (dbError) {
        console.log('⚠️  DB records not found, using provided values');
      }

      // Enrich input with names (prioritize provided values)
      input.chapter_name = input.chapter_name || chapter?.chapter_name || input.topic || 'Chapter';
      input.subject_name = input.subject_name || subject?.subject_name || 'General';
      input.grade_name = input.grade_name || grade?.grade_name || '8';

      // Set defaults
      input.session_duration = input.session_duration || 45;
      const chapterNumber = input.chapter_number || 1;

      console.log(`📚 Querying Pinecone with all inputs:`);
      console.log(`   Grade: ${input.grade_name}`);
      console.log(`   Subject: ${input.subject_name}`);
      console.log(`   Chapter: ${input.topic || input.chapter_name}`);
      console.log(`   Sessions: ${input.sessions}`);

      // Step 1: Query Pinecone with all required parameters
      const chunks = await this.queryPineconeForContent(
        input.grade_name,
        input.subject_name,
        input.topic || input.chapter_name,
        input.sessions
      );

      if (chunks.length === 0) {
        console.log('⚠️  No specific content found, generating with general knowledge...');
        // Continue with empty context - LLM can still generate based on curriculum knowledge
      }

      console.log(`✓ Found ${chunks.length} content chunks`);

      // Step 2: Prepare context
      console.log('🔍 Analyzing chapter content...');
      const context = this.prepareContext(chunks);

      // Step 3: Generate lesson plan with LLM
      console.log('🤖 Generating lesson plan with AI...');
      const planData = await this.generateLessonPlan(context, input);

      // Step 4: Save to database (if IDs are provided)
      if (input.teacher_id && input.subject_id && input.grade_id) {
        console.log('💾 Saving lesson plan...');
        const savedPlan = await this.saveLessonPlan(planData, input);

        console.log('✅ Lesson plan generated and saved successfully!');
        return {
          success: true,
          lessonPlan: savedPlan,
          saved: true
        };
      } else {
        console.log('✅ Lesson plan generated successfully (not saved - missing IDs)!');
        return {
          success: true,
          lessonPlan: planData,
          saved: false,
          message: 'Lesson plan generated but not saved. Provide teacher_id, subject_id, and grade_id to save.'
        };
      }

    } catch (error) {
      console.error('❌ Error in lesson plan generation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = LessonPlanningAgent;
