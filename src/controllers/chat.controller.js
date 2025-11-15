const StudentAssistantAgent = require("../agents/studentAssistantAgent");
const ParentAssistantAgent = require("../agents/parentAssistantAgent");
const ChatConversation = require("../models/ChatConversation.model");
const Student = require("../models/Student.model");
const Parents = require("../models/Parents.model");
const { v4: uuidv4 } = require("uuid");
const { successResponse, errorResponse } = require("../helpers/http-responses");

/**
 * Start a new student chat session
 * Body: { student_id, subject (optional), selected_chapters (optional) }
 */
exports.startStudentChat = async (req, res) => {
  try {
    const { student_id, subject, selected_chapters } = req.body;

    const student = await Student.findById(student_id);
    if (!student) {
      return errorResponse(res, "Student not found", 404);
    }

    const session_id = uuidv4();
    const conversation = new ChatConversation({
      user_type: "student",
      student_id,
      session_id,
      selected_chapters: selected_chapters || [],
      subject_context: subject || null,
      messages: [],
    });

    await conversation.save();

    return successResponse(
      res,
      {
        session_id,
        message: "Student chat session started",
        student: {
          name: `${student.first_name} ${student.last_name}`,
          grade: student.grade.grade_name,
          class: student.class.class_name,
        },
        context: {
          subject: subject || "All subjects",
          chapters: selected_chapters && selected_chapters.length > 0 
            ? selected_chapters 
            : "All chapters",
        },
      },
      201
    );
  } catch (error) {
    console.error("Error starting student chat:", error);
    return errorResponse(res, "Failed to start chat session", 500);
  }
};

/**
 * Start a new parent chat session
 * Body: { parent_id, student_id, subject (optional) }
 */
exports.startParentChat = async (req, res) => {
  try {
    const { parent_id, student_id, subject } = req.body;

    const parent = await Parents.findById(parent_id);
    if (!parent) {
      return errorResponse(res, "Parent not found", 404);
    }

    const student = await Student.findById(student_id);
    if (!student) {
      return errorResponse(res, "Student not found", 404);
    }

    const session_id = uuidv4();
    const conversation = new ChatConversation({
      user_type: "parent",
      parent_id,
      student_id,
      session_id,
      subject_context: subject || null,
      messages: [],
    });

    await conversation.save();

    return successResponse(
      res,
      {
        session_id,
        message: "Parent chat session started",
        parent: {
          name: `${parent.father_fname} ${parent.father_lname}`,
        },
        child: {
          name: `${student.first_name} ${student.last_name}`,
          grade: student.grade.grade_name,
          class: student.class.class_name,
        },
        context: {
          subject: subject || "All subjects",
        },
      },
      201
    );
  } catch (error) {
    console.error("Error starting parent chat:", error);
    return errorResponse(res, "Failed to start chat session", 500);
  }
};

/**
 * Send a message and get AI response (handles both student and parent)
 */
exports.sendMessage = async (req, res) => {
  try {
    const { session_id, message } = req.body;

    if (!message || message.trim() === "") {
      return errorResponse(res, "Message cannot be empty", 400);
    }

    const conversation = await ChatConversation.findOne({ session_id });
    if (!conversation) {
      return errorResponse(res, "Chat session not found", 404);
    }

    const student = await Student.findById(conversation.student_id);
    if (!student) {
      return errorResponse(res, "Student not found", 404);
    }

    const conversationHistory = conversation.messages.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    let result;

    if (conversation.user_type === "student") {
      // Student chat
      const studentInfo = {
        student_id: student._id.toString(),
        first_name: student.first_name,
        last_name: student.last_name,
        grade_name: student.grade.grade_name,
        grade_id: student.grade.grade_id,
        class_name: student.class.class_name,
        class_id: student.class.class_id,
        subject: conversation.subject_context,
      };

      const agent = new StudentAssistantAgent();
      result = await agent.chat(
        message,
        studentInfo,
        conversationHistory,
        conversation.selected_chapters
      );

      if (agent.shouldNotifyTeacher(message, studentInfo)) {
        conversation.needs_teacher_attention = true;
      }
    } else if (conversation.user_type === "parent") {
      // Parent chat
      const parent = await Parents.findById(conversation.parent_id);
      if (!parent) {
        return errorResponse(res, "Parent not found", 404);
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
        subject: conversation.subject_context,
      };

      const agent = new ParentAssistantAgent();
      result = await agent.chat(message, parentInfo, childInfo, conversationHistory);
    }

    if (!result.success) {
      return errorResponse(res, "Failed to generate response", 500);
    }

    conversation.messages.push({
      role: "user",
      content: message,
      timestamp: new Date(),
    });

    conversation.messages.push({
      role: "assistant",
      content: result.response,
      timestamp: new Date(),
    });

    conversation.last_activity = new Date();
    await conversation.save();

    return successResponse(res, {
      response: result.response,
      tools_used: result.tools_used || [],
      session_id,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return errorResponse(res, "Failed to send message", 500);
  }
};

/**
 * Get chat history for a session
 */
exports.getChatHistory = async (req, res) => {
  try {
    const { session_id } = req.params;

    const conversation = await ChatConversation.findOne({ session_id });
    if (!conversation) {
      return errorResponse(res, "Chat session not found", 404);
    }

    return successResponse(res, {
      session_id,
      messages: conversation.messages,
      status: conversation.status,
    });
  } catch (error) {
    console.error("Error getting chat history:", error);
    return errorResponse(res, "Failed to get chat history", 500);
  }
};

/**
 * Get all chat sessions for a student
 */
exports.getStudentSessions = async (req, res) => {
  try {
    const { student_id } = req.params;

    const conversations = await ChatConversation.find({ student_id })
      .sort({ last_activity: -1 })
      .select("session_id status last_activity messages subject_context needs_teacher_attention");

    const sessions = conversations.map((conv) => ({
      session_id: conv.session_id,
      status: conv.status,
      last_activity: conv.last_activity,
      message_count: conv.messages.length,
      subject_context: conv.subject_context,
      needs_teacher_attention: conv.needs_teacher_attention,
      last_message: conv.messages.length > 0 
        ? conv.messages[conv.messages.length - 1].content.substring(0, 100) 
        : null,
    }));

    return successResponse(res, { sessions });
  } catch (error) {
    console.error("Error getting student sessions:", error);
    return errorResponse(res, "Failed to get student sessions", 500);
  }
};

/**
 * Close a chat session
 */
exports.closeChatSession = async (req, res) => {
  try {
    const { session_id } = req.params;

    const conversation = await ChatConversation.findOneAndUpdate(
      { session_id },
      { status: "Closed" },
      { new: true }
    );

    if (!conversation) {
      return errorResponse(res, "Chat session not found", 404);
    }

    return successResponse(res, {
      message: "Chat session closed successfully",
      session_id,
    });
  } catch (error) {
    console.error("Error closing chat session:", error);
    return errorResponse(res, "Failed to close chat session", 500);
  }
};

/**
 * Get sessions needing teacher attention
 */
exports.getSessionsNeedingAttention = async (req, res) => {
  try {
    const conversations = await ChatConversation.find({
      needs_teacher_attention: true,
      teacher_notified: false,
      status: "Active",
    })
      .populate("student_id", "first_name last_name grade class")
      .sort({ last_activity: -1 });

    const sessions = conversations.map((conv) => ({
      session_id: conv.session_id,
      student: {
        id: conv.student_id._id,
        name: `${conv.student_id.first_name} ${conv.student_id.last_name}`,
        grade: conv.student_id.grade.grade_name,
        class: conv.student_id.class.class_name,
      },
      last_activity: conv.last_activity,
      message_count: conv.messages.length,
      recent_messages: conv.messages.slice(-5),
    }));

    return successResponse(res, { sessions });
  } catch (error) {
    console.error("Error getting sessions needing attention:", error);
    return errorResponse(res, "Failed to get sessions", 500);
  }
};
