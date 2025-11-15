/**
 * Retell AI Integration Service
 * Handles voice call creation and management
 */

const Retell = require("retell-sdk");
const VoiceCall = require("../models/VoiceCall.model");
const { v4: uuidv4 } = require("uuid");

class RetellService {
  constructor() {
    this.client = new Retell({
      apiKey: process.env.RETELL_API_KEY,
    });
  }

  /**
   * Create a web call for student
   */
  async createStudentCall(studentId, metadata = {}) {
    try {
      const callId = uuidv4();

      // Create Retell web call with custom LLM
      const webCallResponse = await this.client.call.createWebCall({
        agent_id: process.env.RETELL_AGENT_ID_STUDENT,
        metadata: {
          call_id: callId,
          user_type: "student",
          student_id: studentId,
          ...metadata,
        },
      });

      // Save call to database
      const voiceCall = new VoiceCall({
        call_id: callId,
        user_type: "student",
        student_id: studentId,
        retell_call_id: webCallResponse.call_id,
        access_token: webCallResponse.access_token,
        status: "initiated",
        metadata,
      });

      await voiceCall.save();

      return {
        call_id: callId,
        access_token: webCallResponse.access_token,
        retell_call_id: webCallResponse.call_id,
      };
    } catch (error) {
      console.error("Error creating student call:", error);
      throw error;
    }
  }

  /**
   * Create a web call for parent
   */
  async createParentCall(parentId, studentId, metadata = {}) {
    try {
      const callId = uuidv4();

      const webCallResponse = await this.client.call.createWebCall({
        agent_id: process.env.RETELL_AGENT_ID_PARENT,
        metadata: {
          call_id: callId,
          user_type: "parent",
          parent_id: parentId,
          student_id: studentId,
          ...metadata,
        },
      });

      const voiceCall = new VoiceCall({
        call_id: callId,
        user_type: "parent",
        parent_id: parentId,
        student_id: studentId,
        retell_call_id: webCallResponse.call_id,
        access_token: webCallResponse.access_token,
        status: "initiated",
        metadata,
      });

      await voiceCall.save();

      return {
        call_id: callId,
        access_token: webCallResponse.access_token,
        retell_call_id: webCallResponse.call_id,
      };
    } catch (error) {
      console.error("Error creating parent call:", error);
      throw error;
    }
  }

  /**
   * Update call status
   */
  async updateCallStatus(callId, status, additionalData = {}) {
    try {
      const update = {
        status,
        ...additionalData,
      };

      if (status === "ended") {
        update.ended_at = new Date();
      }

      await VoiceCall.findOneAndUpdate({ call_id: callId }, update);
    } catch (error) {
      console.error("Error updating call status:", error);
    }
  }

  /**
   * Save call transcript
   */
  async saveTranscript(callId, transcript) {
    try {
      await VoiceCall.findOneAndUpdate(
        { call_id: callId },
        { transcript }
      );
    } catch (error) {
      console.error("Error saving transcript:", error);
    }
  }

  /**
   * Get call details
   */
  async getCall(callId) {
    try {
      return await VoiceCall.findOne({ call_id: callId })
        .populate("student_id")
        .populate("parent_id");
    } catch (error) {
      console.error("Error getting call:", error);
      return null;
    }
  }

  /**
   * Get call history for student
   */
  async getStudentCallHistory(studentId, limit = 10) {
    try {
      return await VoiceCall.find({ student_id: studentId })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error("Error getting call history:", error);
      return [];
    }
  }
}

module.exports = new RetellService();
