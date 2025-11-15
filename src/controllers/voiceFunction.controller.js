/**
 * Voice Function Handlers for Retell
 * These endpoints are called by Retell when functions are invoked
 */

const StudentAssistantAgent = require("../agents/studentAssistantAgent");
const ParentAssistantAgent = require("../agents/parentAssistantAgent");
const retellService = require("../services/retell.service");

/**
 * Function: search_knowledge_base
 */
exports.searchKnowledgeBase = async (req, res) => {
  try {
    // Retell sends function args in req.body.args
    const args = req.body.args || {};
    const query = args.query || req.body.query || req.query.query;
    const subject = args.subject || req.body.subject || req.query.subject;
    
    // Call ID is in req.body.call.call_id
    const call_id = req.body.call?.call_id;
    
    console.log("🔍 FUNCTION CALLED: search_knowledge_base");
    console.log("   Query:", query);
    console.log("   Subject:", subject);
    console.log("   Call ID:", call_id);
    console.log("   Args:", args);

    // Extract and map chapter numbers based on subject
    const extractAndMapChapters = (queryText, subjectName) => {
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

    const detectedChapters = extractAndMapChapters(query, subject);
    console.log("   📖 Detected chapters:", detectedChapters);

    // Get call details to get student context (if exists)
    const call = await retellService.getCall(call_id);
    
    const agent = new StudentAssistantAgent();
    
    // Use call metadata if available, otherwise use defaults
    const context = {
      grade: call?.metadata?.grade ? parseInt(call.metadata.grade.replace(/\D/g, "")) : 8,
      subject: subject || call?.metadata?.subject || "Science",
      selected_chapters: detectedChapters.length > 0 ? detectedChapters : (call?.metadata?.selected_chapters || []),
    };

    console.log("   Context:", context);

    const results = await agent.searchKnowledgeBase(
      query,
      context.subject,
      context.grade,
      context.selected_chapters
    );
    
    console.log("   Results found:", results.length);

    if (results.length === 0) {
      console.log("❌ No results found in textbook");
      return res.json({
        result: "I couldn't find specific information about that in the textbook. Let me explain it in general terms.",
      });
    }

    // Format results for voice
    const content = results
      .slice(0, 2)
      .map((r) => r.content)
      .join(" ");

    console.log("📖 Content fetched (first 200 chars):", content.substring(0, 200));
    console.log("🎤 Sending to Retell:", content.substring(0, 500));

    return res.json({
      result: content.substring(0, 500), // Limit for voice
    });
  } catch (error) {
    console.error("Error in search_knowledge_base:", error);
    return res.json({
      result: "I'm having trouble searching right now.",
    });
  }
};

/**
 * Function: get_student_progress
 */
exports.getStudentProgress = async (req, res) => {
  try {
    const args = req.body.args || {};
    const subject = args.subject || req.body.subject || req.query.subject;
    const call_id = req.body.call?.call_id;
    
    console.log("📊 FUNCTION CALLED: get_student_progress");
    console.log("   Subject:", subject);
    console.log("   Call ID:", call_id);
    console.log("   Args:", args);

    const call = await retellService.getCall(call_id);
    
    // If no call found, return helpful message
    if (!call || !call.student_id) {
      return res.json({
        result: "I don't have your student information yet. Please start a proper call session first.",
      });
    }

    const agent = new StudentAssistantAgent();
    const progress = await agent.getStudentProgress(
      call.student_id.toString(),
      subject || call.metadata?.subject
    );

    if (progress.error || progress.message) {
      return res.json({
        result: "I don't have your assessment history yet. Once you complete some assessments, I can show you your progress.",
      });
    }

    // Format for voice
    const response = `You've completed ${progress.total_assessments} assessments with an average score of ${progress.average_score}%. ${
      progress.weak_topics && progress.weak_topics.length > 0
        ? `You might want to review: ${progress.weak_topics.slice(0, 2).join(", ")}.`
        : "You're doing well overall!"
    }`;

    return res.json({ result: response });
  } catch (error) {
    console.error("Error in get_student_progress:", error);
    return res.json({
      result: "I'm having trouble getting your progress right now.",
    });
  }
};

/**
 * Function: get_upcoming_assessments
 */
exports.getUpcomingAssessments = async (req, res) => {
  try {
    const call_id = req.body.call?.call_id;
    
    console.log("📅 FUNCTION CALLED: get_upcoming_assessments");
    console.log("   Call ID:", call_id);

    const call = await retellService.getCall(call_id);
    
    // If no call found, return helpful message
    if (!call || !call.student_id) {
      return res.json({
        result: "I don't have your student information yet. Please start a proper call session first.",
      });
    }

    const agent = new StudentAssistantAgent();
    const assessments = await agent.getUpcomingAssessments(
      call.student_id.toString(),
      call.student_id.grade?.grade_id,
      call.student_id.class?.class_id
    );

    if (!assessments || assessments.length === 0) {
      return res.json({
        result: "You don't have any upcoming assessments scheduled right now.",
      });
    }

    // Format for voice
    const upcoming = assessments.slice(0, 3);
    const response = `You have ${upcoming.length} upcoming assessment${
      upcoming.length > 1 ? "s" : ""
    }. ${upcoming
      .map(
        (a) =>
          `${a.subject} on ${new Date(a.opens_on).toLocaleDateString()}, covering ${a.topics.slice(0, 2).join(" and ")}`
      )
      .join(". ")}`;

    return res.json({ result: response });
  } catch (error) {
    console.error("Error in get_upcoming_assessments:", error);
    return res.json({
      result: "I'm having trouble getting your assessments right now.",
    });
  }
};
