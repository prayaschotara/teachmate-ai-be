/**
 * Service to index educational content into Pinecone for RAG
 * Indexes: Lesson Plans, Curated Resources, Assessment Questions
 */

const { Pinecone } = require("@pinecone-database/pinecone");
const axios = require("axios");
const LessonPlan = require("../models/LessonPlan.model");
const Assessment = require("../models/Assessment.model");
const AssessmentQuestions = require("../models/AssessmentQuestions.model");

class ContentIndexerService {
  constructor() {
    this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
    this.embeddingModel = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
  }

  /**
   * Generate embeddings using OpenRouter
   */
  async generateEmbedding(text) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/embeddings",
        {
          model: this.embeddingModel,
          input: text,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
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
   * Index lesson plan content
   */
  async indexLessonPlan(lessonPlanId) {
    try {
      const lessonPlan = await LessonPlan.findById(lessonPlanId);
      if (!lessonPlan) {
        throw new Error("Lesson plan not found");
      }

      const vectors = [];

      // Index overall objectives
      for (const objective of lessonPlan.overall_objectives) {
        const text = `${lessonPlan.subject_name} - ${lessonPlan.chapter_name}: ${objective}`;
        const embedding = await this.generateEmbedding(text);

        vectors.push({
          id: `lesson-${lessonPlanId}-obj-${vectors.length}`,
          values: embedding,
          metadata: {
            type: "lesson_objective",
            lesson_plan_id: lessonPlanId.toString(),
            subject: lessonPlan.subject_name,
            grade: lessonPlan.grade_name,
            chapter: lessonPlan.chapter_name,
            topic: objective,
            text: objective,
          },
        });
      }

      // Index session details
      for (const session of lessonPlan.session_details) {
        for (const topic of session.topics_covered) {
          const text = `${lessonPlan.subject_name} - ${lessonPlan.chapter_name} - Session ${session.session_number}: ${topic}`;
          const embedding = await this.generateEmbedding(text);

          vectors.push({
            id: `lesson-${lessonPlanId}-session-${session.session_number}-topic-${vectors.length}`,
            values: embedding,
            metadata: {
              type: "lesson_topic",
              lesson_plan_id: lessonPlanId.toString(),
              subject: lessonPlan.subject_name,
              grade: lessonPlan.grade_name,
              chapter: lessonPlan.chapter_name,
              session_number: session.session_number,
              topic: topic,
              text: topic,
            },
          });
        }
      }

      // Upsert to Pinecone
      await this.index.namespace("educational-content").upsert(vectors);

      console.log(`Indexed ${vectors.length} vectors for lesson plan ${lessonPlanId}`);
      return { success: true, vectorCount: vectors.length };
    } catch (error) {
      console.error("Error indexing lesson plan:", error);
      throw error;
    }
  }

  /**
   * Index assessment questions
   */
  async indexAssessmentQuestions(assessmentId) {
    try {
      const assessment = await Assessment.findById(assessmentId);
      if (!assessment) {
        throw new Error("Assessment not found");
      }

      const questions = await AssessmentQuestions.find({ assessment_id: assessmentId });
      const vectors = [];

      for (const question of questions) {
        const text = `${assessment.subject_name} - ${question.question_text}`;
        const embedding = await this.generateEmbedding(text);

        vectors.push({
          id: `assessment-${assessmentId}-q-${question.question_id}`,
          values: embedding,
          metadata: {
            type: "assessment_question",
            assessment_id: assessmentId.toString(),
            question_id: question.question_id,
            subject: assessment.subject_name,
            grade: assessment.grade_name,
            topic: question.topic,
            difficulty: question.difficulty_level,
            text: question.question_text,
          },
        });
      }

      if (vectors.length > 0) {
        await this.index.namespace("educational-content").upsert(vectors);
        console.log(`Indexed ${vectors.length} questions for assessment ${assessmentId}`);
      }

      return { success: true, vectorCount: vectors.length };
    } catch (error) {
      console.error("Error indexing assessment questions:", error);
      throw error;
    }
  }

  /**
   * Index all lesson plans for a grade/subject
   */
  async indexAllLessonPlans(gradeId = null, subjectId = null) {
    try {
      const query = { status: "Active" };
      if (gradeId) query.grade_id = gradeId;
      if (subjectId) query.subject_id = subjectId;

      const lessonPlans = await LessonPlan.find(query);
      let totalVectors = 0;

      for (const lessonPlan of lessonPlans) {
        const result = await this.indexLessonPlan(lessonPlan._id);
        totalVectors += result.vectorCount;
      }

      console.log(`Indexed ${totalVectors} vectors from ${lessonPlans.length} lesson plans`);
      return { success: true, lessonPlanCount: lessonPlans.length, totalVectors };
    } catch (error) {
      console.error("Error indexing all lesson plans:", error);
      throw error;
    }
  }

  /**
   * Delete indexed content for a lesson plan
   */
  async deleteIndexedLessonPlan(lessonPlanId) {
    try {
      // Query vectors with this lesson plan ID
      const results = await this.index.namespace("educational-content").query({
        vector: new Array(1536).fill(0), // Dummy vector
        topK: 10000,
        filter: { lesson_plan_id: lessonPlanId.toString() },
        includeMetadata: false,
      });

      const idsToDelete = results.matches.map((match) => match.id);

      if (idsToDelete.length > 0) {
        await this.index.namespace("educational-content").deleteMany(idsToDelete);
        console.log(`Deleted ${idsToDelete.length} vectors for lesson plan ${lessonPlanId}`);
      }

      return { success: true, deletedCount: idsToDelete.length };
    } catch (error) {
      console.error("Error deleting indexed lesson plan:", error);
      throw error;
    }
  }
}

module.exports = ContentIndexerService;
