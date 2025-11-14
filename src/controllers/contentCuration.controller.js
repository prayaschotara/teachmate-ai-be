const ContentCurationAgent = require('../agents/contentCurationAgent');

const contentCurationController = {
  /**
   * Curate content for lesson plan
   * POST /api/content/curate
   */
  async curateContent(req, res) {
    try {
      const {
        lesson_plan_id,
        subject,
        grade,
        topics
      } = req.body;

      // Validate required fields
      if (!lesson_plan_id || !subject || !topics) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: lesson_plan_id, subject, topics'
        });
      }

      if (!Array.isArray(topics) || topics.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Topics must be a non-empty array'
        });
      }

      // Initialize agent
      const agent = new ContentCurationAgent();

      // Curate content
      const result = await agent.curate(req.body);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Content curated successfully',
        data: {
          videos: result.videos,
          simulations: result.simulations,
          summary: result.summary
        }
      });

    } catch (error) {
      console.error('Error in curateContent controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = contentCurationController;
