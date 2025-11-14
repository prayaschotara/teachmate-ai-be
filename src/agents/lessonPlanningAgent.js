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
   * Query Pinecone for chapter content
   */
  async queryPineconeForChapter(chapterNumber, grade) {
    try {
      // Create a simple embedding query to get all chunks
      // We'll use a generic science query to get relevant chunks
      const queryText = "science education learning teaching";
      
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

      // Query Pinecone with the embedding and filter
      const results = await this.index.query({
        vector: embedding,
        topK: 200,  // Get up to 200 chunks
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
   * Build prompt for LLM
   */
  buildPrompt(context, input) {
    return `Create a detailed lesson plan for the following chapter:

CHAPTER INFORMATION:
- Topic: ${context.topic}
- Grade: ${input.grade_name}
- Subject: ${input.subject_name}
- Total Sessions: ${input.sessions}
- Session Duration: 45 minutes

CHAPTER CONTENT SUMMARY:
${context.explanations.substring(0, 2000)}

AVAILABLE RESOURCES:
- Examples: ${context.examples ? 'Yes' : 'No'}
- Activities: ${context.activities ? 'Yes' : 'No'}
- Exercises: ${context.exercises ? 'Yes' : 'No'}

TASK:
Create a lesson plan that divides this chapter into ${input.sessions} sessions. Each session should have:
1. Clear learning objectives
2. Topics to be covered
3. Teaching flow with time slots
4. Assessment questions

IMPORTANT:
- Distribute topics logically across sessions
- Ensure progressive difficulty
- Include variety (theory, examples, activities)
- Each session should be 45 minutes
- Follow CBSE curriculum standards

OUTPUT FORMAT (JSON only, no other text):
{
  "session_details": [
    {
      "session_number": 1,
      "learning_objectives": ["objective 1", "objective 2"],
      "topics_covered": ["topic 1", "topic 2"],
      "teaching_flow": [
        {
          "time_slot": "0-10 min",
          "activity": "Introduction",
          "description": "Brief description"
        }
      ]
    }
  ],
  "overall_objectives": ["overall objective 1"],
  "prerequisites": ["prerequisite 1"],
  "learning_outcomes": ["outcome 1"]
}

NOTE: Do NOT include assessment or recommended_videos fields. They will be added later by other agents.`;
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
        chapter_name: input.chapter_name,
        chapter_number: input.chapter_number,
        total_sessions: input.sessions,
        session_duration: 45,
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
   * Main method to generate lesson plan
   */
  async generate(input) {
    try {
      console.log('🎯 Starting lesson plan generation...');
      
      // Validate input
      if (!input.chapter_number || !input.sessions) {
        throw new Error('Chapter number and sessions are required');
      }

      // Fetch chapter details (with fallback)
      let chapter, subject, grade;
      
      try {
        chapter = await Chapter.findById(input.chapter_id);
        subject = await Subject.findById(input.subject_id);
        grade = await Grade.findById(input.grade_id);
      } catch (dbError) {
        console.log('⚠️  DB records not found, using defaults');
      }

      // Enrich input with names (use provided or defaults)
      input.chapter_name = chapter?.chapter_name || input.chapter_name || 'Science Chapter';
      input.subject_name = subject?.subject_name || input.subject_name || 'Science';
      input.grade_name = grade?.grade_name || input.grade_name || '8';

      console.log('📚 Querying Pinecone for chapter content...');
      // Step 1: Query Pinecone
      const chunks = await this.queryPineconeForChapter(
        input.chapter_number,
        parseInt(input.grade_name)
      );

      if (chunks.length === 0) {
        throw new Error('No content found for this chapter in database');
      }

      console.log(`✓ Found ${chunks.length} content chunks`);

      // Step 2: Prepare context
      console.log('🔍 Analyzing chapter content...');
      const context = this.prepareContext(chunks);

      // Step 3: Generate lesson plan with LLM
      console.log('🤖 Generating lesson plan with AI...');
      const planData = await this.generateLessonPlan(context, input);

      // Step 4: Save to database
      console.log('💾 Saving lesson plan...');
      const savedPlan = await this.saveLessonPlan(planData, input);

      console.log('✅ Lesson plan generated successfully!');
      return {
        success: true,
        lessonPlan: savedPlan
      };

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
