/**
 * Agent 4: 24/7 Student Assistant Chatbot
 * Uses RAG with Tool Calling to answer student questions
 * Tools: Pinecone search, MongoDB queries for assessments/submissions
 */

const { Pinecone } = require("@pinecone-database/pinecone");
const axios = require("axios");
const Submission = require("../models/Submission.model");
const Assessment = require("../models/Assessment.model");

class StudentAssistantAgent {
  constructor() {
    this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
    this.chatModel = "anthropic/claude-3.5-sonnet";

    // Define tools for the agent
    this.tools = this.defineTools();
  }

  extractAndMapChapters(queryText, subjectName) {
    const chapters = [];
    const lowerQuery = queryText.toLowerCase();

    // Match patterns like "chapter 1", "ch 2", "first chapter", "chapter one"
    const numberWords = {
      'first': '1', 'second': '2', 'third': '3', 'fourth': '4', 'fifth': '5',
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
      'eleven': '11', 'twelve': '12'
    };

    // Replace word numbers with digits
    let processedQuery = lowerQuery;
    Object.keys(numberWords).forEach(word => {
      processedQuery = processedQuery.replace(new RegExp(`\\b${word}\\b`, 'g'), numberWords[word]);
    });

    // Extract chapter numbers: "chapter 1", "ch 2", "chapter 101"
    const chapterMatches = processedQuery.match(/(?:chapter|ch\.?)\s*(\d+)/g);
    if (chapterMatches) {
      chapterMatches.forEach(match => {
        const num = match.match(/\d+/)[0];

        // Map chapter numbers based on subject
        // English: 1, 2, 3... → "1", "2", "3"
        // Math/Science: 1, 2, 3... → "101", "102", "103"
        const subjectLower = (subjectName || '').toLowerCase();

        if (subjectLower.includes('english')) {
          // English uses simple numbering
          chapters.push(num);
        } else if (subjectLower.includes('math') || subjectLower.includes('science')) {
          // Math/Science use 101, 102, 103...
          // If user says "chapter 1", map to "101"
          // If user says "chapter 101", keep as "101"
          if (parseInt(num) < 100) {
            chapters.push(`${100 + parseInt(num)}`);
          } else {
            chapters.push(num);
          }
        } else {
          // Default: keep as-is
          chapters.push(num);
        }
      });
    }

    return chapters;
  };

  /**
   * Define tools available to the agent
   */
  defineTools() {
    return [
      {
        type: "function",
        function: {
          name: "search_knowledge_base",
          description: "Search the textbook content for information about a specific topic or concept. Use this when student asks about subject concepts, definitions, or explanations.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to find relevant content",
              },
              subject: {
                type: "string",
                description: "The subject to search in (e.g., Science, Math, english)",
              },
              chapter: {
                type: "string",
                description: "The chapter to search in the subject"
              }
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_student_progress",
          description: "Get student's recent assessment performance and identify weak areas. Use this when student asks about their progress, performance, or what to study.",
          parameters: {
            type: "object",
            properties: {
              student_id: {
                type: "string",
                description: "The student's ID",
              },
              subject: {
                type: "string",
                description: "Optional: filter by specific subject",
              },
            },
            required: ["student_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_upcoming_assessments",
          description: "Get list of upcoming assessments for the student. Use this when student asks about tests, quizzes, or what's coming up.",
          parameters: {
            type: "object",
            properties: {
              student_id: {
                type: "string",
                description: "The student's ID",
              },
            },
            required: ["student_id"],
          },
        },
      },
    ];
  }

  /**
   * Generate embeddings for text using OpenRouter
   */
  async generateEmbedding(text) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/embeddings",
        {
          model: "openai/text-embedding-3-small",
          input: text,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://teachmate-ai.com",
            "X-Title": "TeachMate AI",
          },
        }
      );
      return response.data.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error.message);
      throw error;
    }
  }

  /**
   * Tool: Search knowledge base (Pinecone) with chapter filtering
   */
  async searchKnowledgeBase(query, subject = null, grade = 8, chapters = []) {
    try {
      console.log("------", query, subject)
      const queryEmbedding = await this.generateEmbedding(query);

      // Normalize subject name to match Pinecone data
      const normalizeSubject = (subj) => {
        if (!subj) return null;
        const lower = subj.toLowerCase();
        // Map common variations
        if (lower.includes('math')) return 'Mathematics';
        if (lower.includes('science')) return 'Science';
        if (lower.includes('english')) return 'english'; // lowercase in your data
        return subj; // return as-is for others
      };

      // Match your Pinecone metadata structure
      const filter = {
        grade: typeof grade === 'number' ? grade : parseInt(grade) || 8,
      };

      // Add subject filter if provided
      if (subject) {
        filter.subject = normalizeSubject(subject);
      }

      // Filter by specific chapters if provided
      // Don't filter by chapter in Pinecone - let semantic search handle it
      // The chapter context is already in the query and system prompt

      console.log("🔍 Pinecone Query Filter:", JSON.stringify(filter));

      const results = await this.index.query({
        vector: queryEmbedding,
        topK: 5,
        filter,
        includeMetadata: true,
      });
      console.log("results", results)

      console.log("📊 Pinecone Results:", results.matches?.length || 0);
      if (results.matches && results.matches.length > 0) {
        console.log("📚 First result:", results.matches[0].metadata?.topic);
      }

      const matches = results.matches || [];
      return matches.map((match) => ({
        content: match.metadata?.textPreview || match.metadata?.text || "",
        chapter: match.metadata?.chapter,
        topic: match.metadata?.topic,
        score: match.score,
      }));
    } catch (error) {
      console.error("Error searching knowledge base:", error.message);
      return [];
    }
  }

  /**
   * Tool: Get student progress from assessments
   */
  async getStudentProgress(studentId, subject = null) {
    try {
      const query = { student_id: studentId, status: "Graded" };

      const submissions = await Submission.find(query)
        .populate("assessment_id")
        .sort({ createdAt: -1 })
        .limit(5);

      if (!submissions || submissions.length === 0) {
        return { message: "No assessment history found" };
      }

      // Filter by subject if provided
      let filteredSubmissions = submissions;
      if (subject) {
        filteredSubmissions = submissions.filter(
          (sub) => sub.assessment_id?.subject_name === subject
        );
      }

      // Analyze weak areas
      const weakTopics = {};
      filteredSubmissions.forEach((sub) => {
        sub.answers.forEach((ans) => {
          if (!ans.is_correct && ans.marks_obtained < ans.max_marks * 0.5) {
            const topic = ans.question_text.substring(0, 50);
            weakTopics[topic] = (weakTopics[topic] || 0) + 1;
          }
        });
      });

      return {
        total_assessments: filteredSubmissions.length,
        average_score: (
          filteredSubmissions.reduce((sum, sub) => sum + sub.percentage, 0) /
          filteredSubmissions.length
        ).toFixed(1),
        weak_topics: Object.keys(weakTopics).slice(0, 3),
        recent_scores: filteredSubmissions.map((sub) => ({
          title: sub.assessment_id?.title,
          score: sub.percentage,
          date: sub.submitted_at,
        })),
      };
    } catch (error) {
      console.error("Error getting student progress:", error.message);
      return { error: "Could not fetch progress" };
    }
  }

  /**
   * Tool: Get upcoming assessments
   */
  async getUpcomingAssessments(studentId, gradeId = null, classId = null) {
    try {
      const Student = require("../models/Student.model");
      const student = await Student.findById(studentId);

      if (!student) {
        return { message: "Student not found" };
      }

      const now = new Date();
      const query = {
        grade_id: gradeId || student.grade.grade_id,
        opens_on: { $gte: now },
        status: { $in: ["Scheduled", "Active"] },
      };

      // Optionally filter by class
      if (classId) {
        query.class_id = classId;
      }

      const assessments = await Assessment.find(query)
        .sort({ opens_on: 1 })
        .limit(5);

      return assessments.map((assess) => ({
        title: assess.title,
        subject: assess.subject_name,
        opens_on: assess.opens_on,
        due_date: assess.due_date,
        topics: assess.topics,
      }));
    } catch (error) {
      console.error("Error getting upcoming assessments:", error.message);
      return { error: "Could not fetch assessments" };
    }
  }

  /**
   * Extract and map chapter numbers from query text based on subject
   */
  extractAndMapChapters(queryText, subjectName) {
    const chapters = [];
    const lowerQuery = queryText.toLowerCase();

    // Match patterns like "chapter 1", "ch 2", "first chapter", "chapter one"
    const numberWords = {
      'first': '1', 'second': '2', 'third': '3', 'fourth': '4', 'fifth': '5',
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
      'eleven': '11', 'twelve': '12'
    };

    // Replace word numbers with digits
    let processedQuery = lowerQuery;
    Object.keys(numberWords).forEach(word => {
      processedQuery = processedQuery.replace(new RegExp(`\\b${word}\\b`, 'g'), numberWords[word]);
    });

    // Extract chapter numbers: "chapter 1", "ch 2", "chapter 101"
    const chapterMatches = processedQuery.match(/(?:chapter|ch\.?)\s*(\d+)/g);
    if (chapterMatches) {
      chapterMatches.forEach(match => {
        const num = match.match(/\d+/)[0];

        // Map chapter numbers based on subject
        // English: 1, 2, 3... → "1", "2", "3"
        // Math/Science: 1, 2, 3... → "101", "102", "103"
        const subjectLower = (subjectName || '').toLowerCase();

        if (subjectLower.includes('english')) {
          // English uses simple numbering
          chapters.push(num);
        } else if (subjectLower.includes('math') || subjectLower.includes('science')) {
          // Math/Science use 101, 102, 103...
          // If user says "chapter 1", map to "101"
          // If user says "chapter 101", keep as "101"
          if (parseInt(num) < 100) {
            chapters.push(`${100 + parseInt(num)}`);
          } else {
            chapters.push(num);
          }
        } else {
          // Default: keep as-is
          chapters.push(num);
        }
      });
    }

    return chapters;
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolName, toolArgs, context = {}) {
    switch (toolName) {
      case "search_knowledge_base":
        // Priority: 1. context.selected_chapters (from frontend), 2. extract from query
        let chaptersToUse = [];
        if (context.selected_chapters && context.selected_chapters.length > 0) {
          chaptersToUse = context.selected_chapters;
          console.log(`📖 Using chapters from context: ${chaptersToUse.join(", ")}`);
        } else {
          const detectedChapters = this.extractAndMapChapters(toolArgs.query, context.subject || toolArgs.subject);
          if (detectedChapters.length > 0) {
            chaptersToUse = detectedChapters;
            console.log(`📖 Auto-detected chapters from query: ${chaptersToUse.join(", ")}`);
          }
        }

        return await this.searchKnowledgeBase(
          toolArgs.query,
          context.subject || toolArgs.subject,
          context.grade || 8,
          chaptersToUse
        );
      case "get_student_progress":
        return await this.getStudentProgress(
          toolArgs.student_id,
          context.subject || toolArgs.subject
        );
      case "get_upcoming_assessments":
        return await this.getUpcomingAssessments(
          toolArgs.student_id,
          context.grade_id,
          context.class_id
        );
      default:
        return { error: "Unknown tool" };
    }
  }

  /**
   * Build system prompt with student context
   */
  buildSystemPrompt(studentInfo, selectedChapters = []) {
    let prompt = `You are a helpful, patient, and encouraging AI tutor assistant for ${studentInfo.first_name}, a ${studentInfo.grade_name} student.

Your role:
- Answer questions about lessons, homework, and concepts
- Provide clear, age-appropriate explanations
- Encourage learning and critical thinking
- Be supportive and motivating
- Never give direct answers to homework/test questions, but guide students to find answers themselves

Guidelines:
- Use simple language appropriate for ${studentInfo.grade_name} level
- Break down complex topics into smaller steps
- Ask guiding questions to help students think
- Praise effort and progress
- If a question is outside your knowledge or inappropriate, politely redirect
- Never discuss personal, emotional, or non-academic topics

Student Context:
- Name: ${studentInfo.first_name} ${studentInfo.last_name}
- Grade: ${studentInfo.grade_name}
- Class: ${studentInfo.class_name}`;

    if (studentInfo.subject) {
      prompt += `\n- Current Subject: ${studentInfo.subject}`;
    }

    if (selectedChapters && selectedChapters.length > 0) {
      prompt += `\n- Focused Chapters: ${selectedChapters}`;
      prompt += `\n\nIMPORTANT: The student is currently studying chapters ${selectedChapters}. Prioritize content from these chapters when answering questions and searching the knowledge base.`;
    }

    return prompt;
  }



  /**
   * Generate response using OpenRouter LLM with tool calling
   */
  async generateResponse(messages, useTools = true) {
    try {
      const payload = {
        model: this.chatModel,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      };

      if (useTools) {
        payload.tools = this.tools;
      }

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://teachmate-ai.com",
            "X-Title": "TeachMate AI",
          },
        }
      );

      return response.data.choices[0].message;
    } catch (error) {
      console.error("Error generating response:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error(
          "Response data:",
          JSON.stringify(error.response.data, null, 2)
        );
      }
      throw error;
    }
  }

  /**
   * Main chat function with tool calling and chapter context
   */
  async chat(query, studentInfo, conversationHistory = [], selectedChapters = []) {
    try {
      const systemPrompt = this.buildSystemPrompt(studentInfo, selectedChapters);

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: query },
      ];

      let toolsUsed = [];
      let maxIterations = 3;
      let iteration = 0;

      const context = {
        grade: parseInt(studentInfo.grade_name.replace(/\D/g, "")) || 8,
        grade_id: studentInfo.grade_id,
        class_id: studentInfo.class_id,
        subject: studentInfo.subject,
        selected_chapters: selectedChapters,
      };

      while (iteration < maxIterations) {
        iteration++;

        const assistantMessage = await this.generateResponse(messages);

        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          messages.push(assistantMessage);

          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name;
            console.log("toooool", toolCall.function.arguments)
            const toolArgs = JSON.parse(toolCall.function.arguments);

            if (!toolArgs.student_id && studentInfo.student_id) {
              toolArgs.student_id = studentInfo.student_id;
            }

            console.log(`🔧 Tool called: ${toolName}`, toolArgs);

            const toolResult = await this.executeTool(toolName, toolArgs, context);
            toolsUsed.push({ name: toolName, args: toolArgs });

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            });
          }
        } else {
          return {
            success: true,
            response: assistantMessage.content,
            tools_used: toolsUsed,
            timestamp: new Date(),
          };
        }
      }

      return {
        success: true,
        response: messages[messages.length - 1].content || "I need more information to help you.",
        tools_used: toolsUsed,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error in chat:", error.message);
      return {
        success: false,
        response:
          "I'm having trouble right now. Please try again in a moment.",
        error: error.message,
      };
    }
  }

  /**
   * Extract subject from query (simple keyword matching)
   */
  extractSubject(query) {
    const lowerQuery = query.toLowerCase();
    const subjects = ["math", "science", "english", "history", "geography"];

    for (const subject of subjects) {
      if (lowerQuery.includes(subject)) {
        return subject.charAt(0).toUpperCase() + subject.slice(1);
      }
    }
    return null;
  }



  /**
   * Check if question needs teacher/parent notification
   */
  shouldNotifyTeacher(query, studentInfo) {
    const concernKeywords = [
      "don't understand",
      "confused",
      "struggling",
      "difficult",
      "hard",
      "help me",
    ];

    const lowerQuery = query.toLowerCase();
    return concernKeywords.some((keyword) => lowerQuery.includes(keyword));
  }
}

module.exports = StudentAssistantAgent;
