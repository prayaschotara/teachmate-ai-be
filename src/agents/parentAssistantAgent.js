/**
 * Agent 4B: Parent Assistant Chatbot
 * Helps parents understand their child's progress and areas for improvement
 */

const { Pinecone } = require("@pinecone-database/pinecone");
const axios = require("axios");
const Submission = require("../models/Submission.model");
const Assessment = require("../models/Assessment.model");
const Student = require("../models/Student.model");

class ParentAssistantAgent {
  constructor() {
    this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
    this.chatModel = "openai/gpt-5.1";
    this.tools = this.defineTools();
  }

  defineTools() {
    return [
      {
        type: "function",
        function: {
          name: "get_child_progress",
          description:
            "Get detailed analysis of child's academic performance including scores, trends, and comparison with class average.",
          parameters: {
            type: "object",
            properties: {
              student_id: {
                type: "string",
                description: "The child's student ID",
              },
              subject: {
                type: "string",
                description: "Optional: filter by specific subject",
              },
              time_period: {
                type: "string",
                description: "Time period: 'last_month', 'last_3_months', 'all'",
                enum: ["last_month", "last_3_months", "all"],
              },
            },
            required: ["student_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_weak_areas",
          description:
            "Identify topics and concepts where the child is struggling based on assessment performance.",
          parameters: {
            type: "object",
            properties: {
              student_id: {
                type: "string",
                description: "The child's student ID",
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
          name: "get_study_recommendations",
          description:
            "Get personalized study recommendations based on child's weak areas and upcoming assessments.",
          parameters: {
            type: "object",
            properties: {
              student_id: {
                type: "string",
                description: "The child's student ID",
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
          description: "Get list of upcoming tests and assessments for the child.",
          parameters: {
            type: "object",
            properties: {
              student_id: {
                type: "string",
                description: "The child's student ID",
              },
            },
            required: ["student_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "understand_topic",
          description:
            "Search educational content to help parent understand what a specific topic is about (so they can help their child).",
          parameters: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                description: "The topic to understand",
              },
              grade: {
                type: "number",
                description: "Grade level",
              },
            },
            required: ["topic", "grade"],
          },
        },
      },
    ];
  }

  buildSystemPrompt(parentInfo, childInfo) {
    return `You are a helpful AI assistant for ${parentInfo.name}, a parent of ${childInfo.first_name} ${childInfo.last_name} (${childInfo.grade_name}).

Child Information:
- Student ID: ${childInfo.student_id}
- Full name: ${childInfo.first_name} ${childInfo.last_name}
- Grade: ${childInfo.grade_name}
- Class: ${childInfo.class_name}

Your role:
- Help parents understand their child's academic progress
- Explain what topics their child is learning
- Identify areas where the child needs improvement
- Provide actionable suggestions for supporting their child's learning
- Be encouraging and supportive

Guidelines:
- Use clear, non-technical language
- Focus on constructive feedback
- Provide specific, actionable recommendations
- Celebrate strengths while addressing weaknesses
- Never share other students' information
- Be respectful of the parent-child relationship


Response Rule: Response should always be in markdown format

Remember: You're helping parents support their child's education, not replacing the teacher.`;
  }

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

  async getChildProgress(studentId, subject = null, timePeriod = "all") {
    try {
      const query = { student_id: studentId, status: "Graded" };

      // Filter by time period
      if (timePeriod !== "all") {
        const now = new Date();
        const daysAgo =
          timePeriod === "last_month" ? 30 : timePeriod === "last_3_months" ? 90 : 0;
        if (daysAgo > 0) {
          query.createdAt = { $gte: new Date(now - daysAgo * 24 * 60 * 60 * 1000) };
        }
      }

      const submissions = await Submission.find(query)
        .populate("assessment_id")
        .sort({ createdAt: -1 });

      if (!submissions || submissions.length === 0) {
        return { message: "No assessment history found for this time period" };
      }
      console.log('subs', submissions)

      let filteredSubmissions = submissions;
      if (subject) {
        filteredSubmissions = submissions.filter(
          (sub) => sub.assessment_id?.subject_name === subject
        );
      }

      console.log("filtered", filteredSubmissions)
      // Calculate statistics
      const scores = filteredSubmissions.map((s) => s.total_marks_obtained);
      console.log("scores", scores)
      const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);

      // Trend analysis (improving/declining)
      const recentScores = scores.slice(0, 3);
      const olderScores = scores.slice(3, 6);
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const olderAvg =
        olderScores.length > 0
          ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length
          : recentAvg;
      const trend = recentAvg > olderAvg + 5 ? "improving" : recentAvg < olderAvg - 5 ? "declining" : "stable";


      console.log("calc response", {
        total_assessments: filteredSubmissions.length,
        average_score: avgScore,
        highest_score: highestScore,
        lowest_score: lowestScore,
        trend,
        recent_assessments: filteredSubmissions.slice(0, 5).map((sub) => ({
          title: sub.assessment_id?.title,
          subject: sub.assessment_id?.subject_name,
          score: sub.total_marks_obtained,
          out_of_total_marks: sub.total_marks,
          date: sub.submitted_at,
          topics: sub.assessment_id?.topics || [],
        })),
      })
      return {
        total_assessments: filteredSubmissions.length,
        average_score: avgScore,
        highest_score: highestScore,
        lowest_score: lowestScore,
        trend,
        recent_assessments: filteredSubmissions.slice(0, 5).map((sub) => ({
          title: sub.assessment_id?.title,
          subject: sub.assessment_id?.subject_name,
          score: sub.total_marks_obtained,
          out_of_total_marks: sub.total_marks,
          date: sub.submitted_at,
          topics: sub.assessment_id?.topics || [],
        })),
      };
    } catch (error) {
      console.error("Error getting child progress:", error.message);
      return { error: "Could not fetch progress" };
    }
  }

  async getWeakAreas(studentId, subject = null) {
    try {
      const submissions = await Submission.find({
        student_id: studentId,
        status: "Graded",
      })
        .populate("assessment_id")
        .sort({ createdAt: -1 })
        .limit(10);

      if (!submissions || submissions.length === 0) {
        return { message: "No assessment data available" };
      }

      let filteredSubmissions = submissions;
      if (subject) {
        filteredSubmissions = submissions.filter(
          (sub) => sub.assessment_id?.subject_name === subject
        );
      }

      // Analyze weak topics
      const topicPerformance = {};
      filteredSubmissions.forEach((sub) => {
        const topics = sub.assessment_id?.topics || [];
        const score = sub.percentage;

        topics.forEach((topic) => {
          if (!topicPerformance[topic]) {
            topicPerformance[topic] = { scores: [], count: 0 };
          }
          topicPerformance[topic].scores.push(score);
          topicPerformance[topic].count++;
        });
      });

      // Calculate average per topic and identify weak ones
      const weakTopics = [];
      Object.keys(topicPerformance).forEach((topic) => {
        const avg =
          topicPerformance[topic].scores.reduce((a, b) => a + b, 0) /
          topicPerformance[topic].count;
        if (avg < 60) {
          weakTopics.push({
            topic,
            average_score: avg.toFixed(1),
            attempts: topicPerformance[topic].count,
          });
        }
      });

      weakTopics.sort((a, b) => a.average_score - b.average_score);

      return {
        weak_topics: weakTopics.slice(0, 5),
        total_topics_analyzed: Object.keys(topicPerformance).length,
      };
    } catch (error) {
      console.error("Error getting weak areas:", error.message);
      return { error: "Could not analyze weak areas" };
    }
  }

  async getStudyRecommendations(studentId) {
    try {
      const weakAreas = await this.getWeakAreas(studentId);
      const upcomingAssessments = await this.getUpcomingAssessments(studentId);

      return {
        weak_areas: weakAreas.weak_topics || [],
        upcoming_assessments: upcomingAssessments.slice(0, 3),
        recommendations: [
          "Focus on topics with lowest scores first",
          "Practice regularly for 30 minutes daily",
          "Review mistakes from past assessments",
          "Prepare for upcoming assessments in advance",
        ],
      };
    } catch (error) {
      console.error("Error getting recommendations:", error.message);
      return { error: "Could not generate recommendations" };
    }
  }

  async getUpcomingAssessments(studentId, gradeId = null, classId = null) {
    try {
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

  async understandTopic(topic, grade) {
    try {
      const queryEmbedding = await this.generateEmbedding(topic);

      const results = await this.index.query({
        vector: queryEmbedding,
        topK: 2,
        filter: { grade: grade.toString() },
        includeMetadata: true,
      });

      const matches = results.matches || [];
      return matches.map((match) => ({
        content: match.metadata?.textPreview || "",
        chapter: match.metadata?.chapter,
        topic: match.metadata?.topic,
      }));
    } catch (error) {
      console.error("Error understanding topic:", error.message);
      return [];
    }
  }

  async executeTool(toolName, toolArgs, context = {}) {
    switch (toolName) {
      case "get_child_progress":
        return await this.getChildProgress(
          toolArgs.student_id,
          context.subject || toolArgs.subject,
          toolArgs.time_period
        );
      case "get_weak_areas":
        return await this.getWeakAreas(
          toolArgs.student_id,
          context.subject || toolArgs.subject
        );
      case "get_study_recommendations":
        return await this.getStudyRecommendations(toolArgs.student_id);
      case "get_upcoming_assessments":
        return await this.getUpcomingAssessments(
          toolArgs.student_id,
          context.grade_id,
          context.class_id
        );
      case "understand_topic":
        return await this.understandTopic(toolArgs.topic, context.grade || toolArgs.grade);
      default:
        return { error: "Unknown tool" };
    }
  }

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
      throw error;
    }
  }

  async chat(query, parentInfo, childInfo, conversationHistory = []) {
    try {
      const systemPrompt = this.buildSystemPrompt(parentInfo, childInfo);
      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: query },
      ];

      let toolsUsed = [];
      let maxIterations = 3;
      let iteration = 0;

      while (iteration < maxIterations) {
        iteration++;

        const assistantMessage = await this.generateResponse(messages);

        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          messages.push(assistantMessage);

          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);


            if (!toolArgs.student_id && childInfo.student_id) {
              toolArgs.student_id = childInfo.student_id;
            }
            if (!toolArgs.grade && childInfo.grade) {
              toolArgs.grade = childInfo.grade;
            }

            console.log(`🔧 Parent Tool: ${toolName}`, toolArgs);

            const context = {
              grade: childInfo.grade,
              grade_id: childInfo.grade_id,
              class_id: childInfo.class_id,
              subject: childInfo.subject,
            };

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
        response:
          messages[messages.length - 1].content ||
          "I need more information to help you.",
        tools_used: toolsUsed,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error in parent chat:", error.message);
      return {
        success: false,
        response: "I'm having trouble right now. Please try again in a moment.",
        error: error.message,
      };
    }
  }
}

module.exports = ParentAssistantAgent;
