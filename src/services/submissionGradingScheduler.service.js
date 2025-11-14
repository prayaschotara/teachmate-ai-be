const cron = require('node-cron');
const SubmissionGradingAgent = require('../agents/submissionGradingAgent');

class SubmissionGradingSchedulerService {
    constructor() {
        this.cronJob = null;
        this.gradingAgent = new SubmissionGradingAgent();
        this.isGrading = false; // Prevent concurrent grading runs
    }

    /**
     * Start the scheduler - runs every 5 minutes to grade ungraded submissions
     */
    start() {
        console.log('🤖 Starting Submission Grading Scheduler...');

        // Run every 5 minutes: '*/5 * * * *'
        // For testing, you can use '* * * * *' (every minute)
        this.cronJob = cron.schedule('* * * * *', async () => {
            if (this.isGrading) {
                console.log('⏳ Grading already in progress, skipping this run...');
                return;
            }

            console.log('\n⏰ Scheduled grading check triggered at:', new Date().toISOString());
            await this.runGradingProcess();
        });

        console.log('✅ Submission Grading Scheduler started (runs every minutes)');
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            console.log('⏹️  Submission Grading Scheduler stopped');
        }
    }

    /**
     * Run the grading process
     */
    async runGradingProcess() {
        this.isGrading = true;

        try {
            const result = await this.gradingAgent.gradeAllUngraded();

            if (result.graded > 0) {
                console.log(`\n📊 Grading Summary:`);
                console.log(`   Total processed: ${result.total}`);
                console.log(`   Successfully graded: ${result.graded}`);
                console.log(`   Failed: ${result.failed || 0}`);
            }

        } catch (error) {
            console.error('❌ Error in grading process:', error.message);
        } finally {
            this.isGrading = false;
        }
    }

    /**
     * Manually trigger grading (useful for testing)
     */
    async triggerManualGrading() {
        console.log('🔄 Running manual grading check...');
        await this.runGradingProcess();
        console.log('✅ Manual grading completed');
    }
}

// Export singleton instance
module.exports = new SubmissionGradingSchedulerService();
