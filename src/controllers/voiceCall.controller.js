const retellService = require("../services/retell.service");
const StudentAssistantAgent = require("../agents/studentAssistantAgent");
const ParentAssistantAgent = require("../agents/parentAssistantAgent");
const Student = require("../models/Student.model");
const Parents = require("../models/Parents.model");
const responseHelper = require("../helpers/http-responses");

/**
 * Start voice call for student
 * Body: { student_id, subject, selected_chapters }
 */
exports.startStudentVoiceCall = async (req, res) => {
  try {
    const { student_id, subject, selected_chapters } = req.body;

    const student = await Student.findById(student_id);
    if (!student) {
      return responseHelper.notFound(res, "Student not found");
    }

    const metadata = {
      subject: subject || null,
      selected_chapters: selected_chapters || [],
      grade: student.grade.grade_name,
      class: student.class.class_name,
    };

    const callData = await retellService.createStudentCall(student_id, metadata);

    return responseHelper.created(res, "Voice call started successfully", {
      call_id: callData.call_id,
      access_token: callData.access_token,
      student: {
        name: `${student.first_name} ${student.last_name}`,
        grade: student.grade.grade_name,
      },
      context: {
        subject: subject || "All subjects",
        chapters: selected_chapters?.length > 0 ? selected_chapters : "All chapters",
      },
    });
  } catch (error) {
    console.error("Error starting student voice call:", error);
    return responseHelper.serverError(res, "Failed to start voice call");
  }
};

/**
 * Start voice call for parent
 * Body: { parent_id, student_id, subject }
 */
exports.startParentVoiceCall = async (req, res) => {
  try {
    const { parent_id, student_id, subject } = req.body;

    const parent = await Parents.findById(parent_id);
    if (!parent) {
      return responseHelper.notFound(res, "Parent not found");
    }

    const student = await Student.findById(student_id);
    if (!student) {
      return responseHelper.notFound(res, "Student not found");
    }

    const metadata = {
      subject: subject || null,
      child_name: `${student.first_name} ${student.last_name}`,
      grade: student.grade.grade_name,
    };

    const callData = await retellService.createParentCall(parent_id, student_id, metadata);

    return responseHelper.created(res, "Voice call started successfully", {
      call_id: callData.call_id,
      access_token: callData.access_token,
      parent: {
        name: `${parent.father_fname} ${parent.father_lname}`,
      },
      child: {
        name: `${student.first_name} ${student.last_name}`,
        grade: student.grade.grade_name,
      },
    });
  } catch (error) {
    console.error("Error starting parent voice call:", error);
    return responseHelper.serverError(res, "Failed to start voice call");
  }
};

/**
 * Retell webhook handler - Custom LLM endpoint
 * This is where Retell sends user speech and expects AI response
 */
exports.handleRetellWebhook = async (req, res) => {
  try {
    const { call_id, transcript, metadata } = req.body;

    // Get call details
    const call = await retellService.getCall(metadata.call_id);
    if (!call) {
      return res.status(404).json({ error: "Call not found" });
    }

    const student = await Student.findById(call.student_id);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    let response;

    if (call.user_type === "student") {
      // Student voice call
      const studentInfo = {
        student_id: student._id.toString(),
        first_name: student.first_name,
        last_name: student.last_name,
        grade_name: student.grade.grade_name,
        grade_id: student.grade.grade_id,
        class_name: student.class.class_name,
        class_id: student.class.class_id,
        subject: call.metadata.subject,
      };

      const agent = new StudentAssistantAgent();
      
      console.log("🎙️ WEBHOOK - Student Query:", transcript);
      
      const result = await agent.chat(
        transcript,
        studentInfo,
        [],
        call.metadata.selected_chapters || []
      );

      console.log("🤖 WEBHOOK - Agent Response:", result.response?.substring(0, 200));
      console.log("🔧 WEBHOOK - Tools Used:", result.tools_used?.map(t => t.name).join(", ") || "None");

      response = result.response;
    } else if (call.user_type === "parent") {
      // Parent voice call
      const parent = await Parents.findById(call.parent_id);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      const parentInfo = {
        parent_id: parent._id.toString(),
        name: `${parent.father_fname} ${parent.father_lname}`,
      };

      const childInfo = {
        student_id: student._id.toString(),
        first_name: student.first_name,
        last_name: student.last_name,
        grade_name: student.grade.grade_name,
        grade_id: student.grade.grade_id,
        class_id: student.class.class_id,
        grade: parseInt(student.grade.grade_name.replace(/\D/g, "")) || 8,
        subject: call.metadata.subject,
      };

      const agent = new ParentAssistantAgent();
      const result = await agent.chat(transcript, parentInfo, childInfo, []);

      response = result.response;
    }

    // Return response to Retell
    return res.json({
      response,
      end_call: false,
    });
  } catch (error) {
    console.error("Error handling Retell webhook:", error);
    return res.status(500).json({
      response: "I'm having trouble right now. Please try again.",
      end_call: false,
    });
  }
};

/**
 * Get call history
 */
exports.getCallHistory = async (req, res) => {
  try {
    const { student_id } = req.params;

    const calls = await retellService.getStudentCallHistory(student_id);

    return responseHelper.success(res, "Call history retrieved successfully", {
      calls: calls.map((call) => ({
        call_id: call.call_id,
        user_type: call.user_type,
        status: call.status,
        duration: call.duration,
        started_at: call.started_at,
        ended_at: call.ended_at,
        transcript: call.transcript,
      })),
    });
  } catch (error) {
    console.error("Error getting call history:", error);
    return responseHelper.serverError(res, "Failed to get call history");
  }
};

/**
 * End call
 */
exports.endCall = async (req, res) => {
  try {
    const { call_id } = req.params;

    await retellService.updateCallStatus(call_id, "ended", {
      ended_at: new Date(),
    });

    return responseHelper.success(res, "Call ended successfully", {
      message: "Call ended successfully",
    });
  } catch (error) {
    console.error("Error ending call:", error);
    return responseHelper.serverError(res, "Failed to end call");
  }
};
