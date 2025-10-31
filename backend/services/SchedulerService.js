const cron = require('node-cron');
const Application = require('../models/Application');
const moment = require('moment');

class SchedulerService {
  constructor() {
    this.jobs = [];
  }

  start() {
    console.log('Starting scheduler service...');
    
    // Reminder notifications disabled - functionality removed

    // Schedule processing time calculation to run daily at midnight
    const processingTimeJob = cron.schedule('0 0 * * *', async () => {
      console.log('Calculating processing times for completed applications...');
      try {
        await this.updateProcessingTimes();
      } catch (error) {
        console.error('Error in processing time calculation job:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/Chicago'
    });

    // Schedule weekly metrics report (Mondays at 8 AM)
    const metricsJob = cron.schedule('0 8 * * 1', async () => {
      console.log('Generating weekly metrics report...');
      try {
        await this.generateWeeklyReport();
      } catch (error) {
        console.error('Error in weekly metrics job:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/Chicago'
    });

    this.jobs = [
      { name: 'processingTimes', job: processingTimeJob },
      { name: 'weeklyMetrics', job: metricsJob }
    ];

    // Start all jobs
    this.jobs.forEach(({ name, job }) => {
      job.start();
      console.log(`Started scheduled job: ${name}`);
    });

    console.log('Scheduler service started successfully');
  }

  stop() {
    console.log('Stopping scheduler service...');
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`Stopped scheduled job: ${name}`);
    });
    this.jobs = [];
    console.log('Scheduler service stopped');
  }

  async updateProcessingTimes() {
    try {
      const completedApplications = await Application.findAll({ 
        status: 'completed' 
      });

      let updatedCount = 0;

      for (const app of completedApplications) {
        if (!app.processingTimeWeeks) {
          const processingTime = app.calculateProcessingTime();
          if (processingTime) {
            await app.update({ processingTimeWeeks: processingTime });
            updatedCount++;
          }
        }
      }

      console.log(`Updated processing times for ${updatedCount} applications`);
      return updatedCount;
    } catch (error) {
      console.error('Error updating processing times:', error);
      throw error;
    }
  }

  async generateWeeklyReport() {
    try {
      const metrics = await Application.getMetrics();
      const weekStart = moment().startOf('week');
      const weekEnd = moment().endOf('week');

      // Get applications submitted this week
      const db = require('../config/database');
      const weeklyQuery = `
        SELECT COUNT(*) as count, status
        FROM applications 
        WHERE DATE(submitted_at) >= DATE(?) 
        AND DATE(submitted_at) <= DATE(?)
        GROUP BY status
      `;
      
      const weeklyStats = await db.all(weeklyQuery, [
        weekStart.format('YYYY-MM-DD'),
        weekEnd.format('YYYY-MM-DD')
      ]);

      const report = {
        week: `${weekStart.format('MMM DD')} - ${weekEnd.format('MMM DD, YYYY')}`,
        totalApplications: metrics.totalApplications,
        averageProcessingTime: metrics.averageProcessingTime,
        stalledApplications: metrics.stalledApplications.length,
        weeklySubmissions: weeklyStats.reduce((sum, stat) => sum + stat.count, 0),
        weeklyByStatus: weeklyStats,
        generatedAt: new Date().toISOString()
      };

      // In a real implementation, this could be emailed to administrators
      console.log('Weekly Report Generated:', JSON.stringify(report, null, 2));

      // You could also save this to a reports table or send via email
      await this.saveWeeklyReport(report);

      return report;
    } catch (error) {
      console.error('Error generating weekly report:', error);
      throw error;
    }
  }

  async saveWeeklyReport(report) {
    try {
      // Save report to database for historical tracking
      const db = require('../config/database');
      
      // Create reports table if it doesn't exist
      await db.run(`
        CREATE TABLE IF NOT EXISTS weekly_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          week_start DATE NOT NULL,
          week_end DATE NOT NULL,
          report_data TEXT NOT NULL,
          generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const weekStart = moment().startOf('week').format('YYYY-MM-DD');
      const weekEnd = moment().endOf('week').format('YYYY-MM-DD');

      await db.run(`
        INSERT INTO weekly_reports (week_start, week_end, report_data)
        VALUES (?, ?, ?)
      `, [weekStart, weekEnd, JSON.stringify(report)]);

      console.log('Weekly report saved to database');
    } catch (error) {
      console.error('Error saving weekly report:', error);
    }
  }

  // Reminder functionality removed - no longer available

  async triggerProcessingTimeUpdate() {
    console.log('Manually triggering processing time updates...');
    const count = await this.updateProcessingTimes();
    console.log(`Updated ${count} processing times`);
    return count;
  }

  async triggerWeeklyReport() {
    console.log('Manually triggering weekly report generation...');
    const report = await this.generateWeeklyReport();
    console.log('Weekly report generated');
    return report;
  }

  getJobStatuses() {
    return this.jobs.map(({ name, job }) => ({
      name,
      running: job.getStatus() === 'scheduled'
    }));
  }
}

module.exports = new SchedulerService();