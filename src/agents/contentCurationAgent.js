const axios = require('axios');
const LessonPlan = require('../models/LessonPlan.model');

class ContentCurationAgent {
  constructor() {
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
    this.youtubeBaseUrl = 'https://www.googleapis.com/youtube/v3';

    // Subject-specific configuration
    this.resourceConfig = {
      Science: {
        channels: [
          'Khan Academy',
          'CrashCourse',
          'Bozeman Science',
          'Amoeba Sisters',
          'Professor Dave Explains',
          'TED-Ed'
        ],
        keywords: ['science', 'experiment', 'explanation', 'CBSE', 'education'],
        simulations: {
          'photosynthesis': {
            title: 'Energy Forms and Changes',
            url: 'https://phet.colorado.edu/en/simulations/energy-forms-and-changes',
            type: 'PhET Simulation'
          },
          'electricity': {
            title: 'Circuit Construction Kit',
            url: 'https://phet.colorado.edu/en/simulations/circuit-construction-kit-dc',
            type: 'PhET Simulation'
          },
          'forces': {
            title: 'Forces and Motion',
            url: 'https://phet.colorado.edu/en/simulations/forces-and-motion-basics',
            type: 'PhET Simulation'
          },
          'light': {
            title: 'Bending Light',
            url: 'https://phet.colorado.edu/en/simulations/bending-light',
            type: 'PhET Simulation'
          },
          'matter': {
            title: 'States of Matter',
            url: 'https://phet.colorado.edu/en/simulations/states-of-matter',
            type: 'PhET Simulation'
          }
        }
      },
      Math: {
        channels: [
          'Khan Academy',
          '3Blue1Brown',
          'Numberphile',
          'PatrickJMT',
          'Math Antics',
          'TED-Ed'
        ],
        keywords: ['math', 'mathematics', 'tutorial', 'problem solving', 'CBSE'],
        simulations: {
          'algebra': {
            title: 'Desmos Graphing Calculator',
            url: 'https://www.desmos.com/calculator',
            type: 'Interactive Tool'
          },
          'geometry': {
            title: 'GeoGebra Geometry',
            url: 'https://www.geogebra.org/geometry',
            type: 'Interactive Tool'
          },
          'graphing': {
            title: 'Desmos Graphing',
            url: 'https://www.desmos.com/calculator',
            type: 'Interactive Tool'
          }
        }
      },
      English: {
        channels: [
          'CrashCourse',
          'TED-Ed',
          'The School of Life',
          'Khan Academy'
        ],
        keywords: ['literature', 'grammar', 'writing', 'english', 'CBSE'],
        simulations: {} // No simulations for English
      }
    };
  }

  /**
   * Parse YouTube duration (PT10M30S -> 10.5 minutes)
   */
  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    return hours * 60 + minutes + seconds / 60;
  }

  /**
   * Calculate relevance score for a video
   */
  calculateRelevance(video, topic, subject) {
    let score = 0;
    const config = this.resourceConfig[subject];

    // 1. Title match (0.4)
    const titleLower = video.snippet.title.toLowerCase();
    const topicLower = topic.toLowerCase();
    if (titleLower.includes(topicLower)) {
      score += 0.4;
    } else if (titleLower.split(' ').some(word => topicLower.includes(word))) {
      score += 0.2;
    }

    // 2. Channel reputation (0.3)
    const channelTitle = video.snippet.channelTitle;
    if (config.channels.some(ch => channelTitle.includes(ch))) {
      score += 0.3;
    }

    // 3. Duration (0.2)
    if (video.contentDetails) {
      const duration = this.parseDuration(video.contentDetails.duration);
      if (duration >= 5 && duration <= 15) {
        score += 0.2;
      } else if (duration >= 3 && duration <= 20) {
        score += 0.1;
      }
    }

    // 4. Engagement (0.1)
    if (video.statistics) {
      const viewCount = parseInt(video.statistics.viewCount || 0);
      const likeCount = parseInt(video.statistics.likeCount || 0);
      if (viewCount > 0) {
        const ratio = likeCount / viewCount;
        if (ratio > 0.02) score += 0.1;
        else if (ratio > 0.01) score += 0.05;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Search YouTube for videos
   */
  async searchYouTube(topic, subject, grade) {
    try {
      const config = this.resourceConfig[subject];
      const keywords = config.keywords.join(' ');
      const query = `${topic} ${subject} ${keywords} grade ${grade}`;

      // Step 1: Search for videos
      const searchResponse = await axios.get(`${this.youtubeBaseUrl}/search`, {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: 10,
          videoDuration: 'medium', // 4-20 minutes
          videoEmbeddable: true,
          relevanceLanguage: 'en', // English videos only
          key: this.youtubeApiKey
        }
      });

      const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(',');

      if (!videoIds) {
        return [];
      }

      // Step 2: Get video details (duration, stats)
      const detailsResponse = await axios.get(`${this.youtubeBaseUrl}/videos`, {
        params: {
          part: 'snippet,contentDetails,statistics',
          id: videoIds,
          hl: 'en', // Interface language
          key: this.youtubeApiKey
        }
      });

      // Filter out non-English videos
      const englishVideos = detailsResponse.data.items.filter(video => {
        const defaultLanguage = video.snippet.defaultLanguage || video.snippet.defaultAudioLanguage;
        // Keep if language is English or undefined (most English videos don't set this)
        return !defaultLanguage || defaultLanguage.startsWith('en');
      });

      // Step 3: Calculate relevance and format
      const videos = englishVideos.map(video => {
        const duration = this.parseDuration(video.contentDetails.duration);
        const relevance = this.calculateRelevance(video, topic, subject);

        return {
          title: video.snippet.title,
          url: `https://www.youtube.com/watch?v=${video.id}`,
          duration: `${Math.floor(duration)}:${String(Math.round((duration % 1) * 60)).padStart(2, '0')}`,
          source: video.snippet.channelTitle,
          topic: topic,
          thumbnail: video.snippet.thumbnails.medium.url,
          relevance_score: relevance,
          subject: subject
        };
      });

      // Sort by relevance and return top 3
      return videos
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 3);

    } catch (error) {
      console.error('Error searching YouTube:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get simulations for topics
   */
  getSimulations(topics, subject) {
    const config = this.resourceConfig[subject];
    const simulations = [];

    topics.forEach(topic => {
      const topicLower = topic.toLowerCase();

      // Check if any simulation keyword matches the topic
      Object.keys(config.simulations).forEach(key => {
        if (topicLower.includes(key) || key.includes(topicLower.split(' ')[0])) {
          const sim = config.simulations[key];
          simulations.push({
            title: sim.title,
            url: sim.url,
            type: sim.type,
            topic: topic,
            subject: subject
          });
        }
      });
    });

    return simulations;
  }

  /**
   * Distribute videos to sessions based on topics covered
   */
  distributeVideosToSessions(lessonPlan, videos, simulations) {
    const updatedSessions = lessonPlan.session_details.map(session => {
      const sessionTopics = session.topics_covered || [];

      // Find videos matching this session's topics
      const sessionVideos = videos.filter(video =>
        sessionTopics.some(topic =>
          topic.toLowerCase().includes(video.topic.toLowerCase()) ||
          video.topic.toLowerCase().includes(topic.toLowerCase())
        )
      );

      // Find simulations matching this session's topics
      const sessionSimulations = simulations.filter(sim =>
        sessionTopics.some(topic =>
          topic.toLowerCase().includes(sim.topic.toLowerCase()) ||
          sim.topic.toLowerCase().includes(topic.toLowerCase())
        )
      );

      // Format resources for this session
      const resources = {
        videos: sessionVideos.map(v => ({
          title: v.title,
          url: v.url,
          duration: v.duration,
          source: v.source,
          topic: v.topic
        })),
        simulations: sessionSimulations.map(s => ({
          title: s.title,
          url: s.url,
          type: s.type,
          topic: s.topic
        }))
      };

      return {
        ...session.toObject(),
        resources: resources
      };
    });

    return updatedSessions;
  }

  /**
   * Save resources to lesson plan
   */
  async saveToLessonPlan(lessonPlanId, resources) {
    try {
      const lessonPlan = await LessonPlan.findById(lessonPlanId);

      if (!lessonPlan) {
        throw new Error('Lesson plan not found');
      }

      // Format for lesson plan schema (overall recommended videos)
      const formattedVideos = resources.videos.map(v => ({
        title: v.title,
        url: v.url,
        duration: v.duration,
        topic: v.topic,
        source: v.source
      }));

      // Distribute videos and simulations to individual sessions
      const updatedSessions = this.distributeVideosToSessions(
        lessonPlan,
        resources.videos,
        resources.simulations
      );

      lessonPlan.recommended_videos = formattedVideos;
      lessonPlan.session_details = updatedSessions;
      await lessonPlan.save();

      console.log('📊 Distribution summary:');
      updatedSessions.forEach((session, idx) => {
        console.log(`  Session ${idx + 1}: ${session.resources.videos.length} videos, ${session.resources.simulations.length} simulations`);
      });

      return lessonPlan;
    } catch (error) {
      console.error('Error saving to lesson plan:', error);
      throw new Error('Failed to save resources to lesson plan');
    }
  }

  /**
   * Main method to curate content
   */
  async curate(input) {
    try {
      console.log('🎯 Starting content curation...');

      // Validate input
      if (!input.lesson_plan_id || !input.subject || !input.topics) {
        throw new Error('lesson_plan_id, subject, and topics are required');
      }

      // Check if subject is supported
      if (!this.resourceConfig[input.subject]) {
        throw new Error(`Subject "${input.subject}" not supported. Supported: Science, Math, English`);
      }

      console.log(`📚 Subject: ${input.subject}`);
      console.log(`📝 Topics: ${input.topics.join(', ')}`);

      const allVideos = [];
      const allSimulations = [];

      // Search for each topic
      for (const topic of input.topics) {
        console.log(`\n🔍 Searching for: ${topic}`);

        // Get YouTube videos
        const videos = await this.searchYouTube(topic, input.subject, input.grade);
        console.log(`  ✓ Found ${videos.length} videos`);
        allVideos.push(...videos);

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
      }

      // Get simulations
      console.log('\n🎮 Finding simulations...');
      const simulations = this.getSimulations(input.topics, input.subject);
      console.log(`  ✓ Found ${simulations.length} simulations`);
      allSimulations.push(...simulations);

      // Optionally save to lesson plan (if save flag is true)
      if (input.save_to_db) {
        console.log('\n💾 Saving to lesson plan...');
        await this.saveToLessonPlan(input.lesson_plan_id, {
          videos: allVideos,
          simulations: allSimulations
        });
      }

      console.log('✅ Content curation completed!');

      return {
        success: true,
        videos: allVideos,
        simulations: allSimulations,
        summary: {
          total_videos: allVideos.length,
          total_simulations: allSimulations.length,
          topics_covered: input.topics.length
        }
      };

    } catch (error) {
      console.error('❌ Error in content curation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ContentCurationAgent;
