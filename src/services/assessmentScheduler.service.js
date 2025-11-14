const cron = require('node-cron');
const Assessment = require('../models/Assessment.model');

class AssessmentSchedulerService {
    constructor() {
        this.cronJob = null;
    }

    /**
     * Start the scheduler - runs every minute to check for assessments to open/close
     */
    start() {
        console.log('🕐 Starting Assessment Scheduler...');

        // Run every minute: '* * * * *'
        this.cronJob = cron.schedule('* * * * *', async () => {

            await this.checkAndOpenAssessments();
            await this.checkAndCloseAssessments();
        });

        console.log('✅ Assessment Scheduler started successfully');
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            console.log('⏹️  Assessment Scheduler stopped');
        }
    }

    /**
     * Check and open assessments that should be active now
     */
    async checkAndOpenAssessments() {
        console.log("checked open")
        try {
            const now = new Date();
            console.log('🕐 Checking assessments to open at:', now.toISOString());

            // Find assessments that should be opened
            const assessmentsToOpen = await Assessment.find({
                status: 'Draft',
                opens_on: { $lte: now },
                isActive: true
            });

            if (assessmentsToOpen.length > 0) {
                console.log(`📋 Found ${assessmentsToOpen.length} assessment(s) to open:`);
                assessmentsToOpen.forEach(a => {
                    console.log(`  - ${a.title} (opens_on: ${a.opens_on.toISOString()})`);
                });
            }

            if (assessmentsToOpen.length > 0) {
                console.log(`\n📝 Opening ${assessmentsToOpen.length} assessment(s)...`);

                for (const assessment of assessmentsToOpen) {
                    assessment.status = 'Active';
                    await assessment.save();

                    console.log(`✓ Opened: ${assessment.title} (ID: ${assessment._id})`);
                }
            }

        } catch (error) {
            console.error('❌ Error opening assessments:', error.message);
        }
    }

    /**
     * Check and close assessments that have passed their due date
     */
    async checkAndCloseAssessments() {
        try {
            const now = new Date();

            // Find assessments that should be closed
            const assessmentsToClose = await Assessment.find({
                status: 'Active',
                due_date: { $lte: now },
                isActive: true
            });

            if (assessmentsToClose.length > 0) {
                console.log(`\n🔒 Closing ${assessmentsToClose.length} assessment(s)...`);

                for (const assessment of assessmentsToClose) {
                    assessment.status = 'Closed';
                    await assessment.save();

                    console.log(`  ✓ Closed: ${assessment.title} (ID: ${assessment._id})`);
                }
            }

        } catch (error) {
            console.error('❌ Error closing assessments:', error.message);
        }
    }

    /**
     * Manually trigger assessment status updates (useful for testing)
     */
    async triggerManualCheck() {
        console.log('🔄 Running manual assessment status check...');
        await this.checkAndOpenAssessments();
        await this.checkAndCloseAssessments();
        console.log('✅ Manual check completed');
    }
}

// Export singleton instance
module.exports = new AssessmentSchedulerService();
