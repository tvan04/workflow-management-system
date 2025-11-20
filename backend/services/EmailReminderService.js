const EmailService = require('./EmailService');
const Application = require('../models/Application');
const db = require('../config/database');

class EmailReminderService {
  constructor() {
    this.emailService = new EmailService();
    this.reminderThresholdDays = 7; // Days before sending reminders
  }

  /**
   * Check for applications stuck at various stages and send reminders
   */
  async checkAndSendReminders() {
    try {
      console.log('Starting email reminder check...');
      
      // Ensure database connection is available
      if (!db.db) {
        await db.connect();
      }
      
      const stuckApplications = await this.getStuckApplications();
      
      let remindersProcessed = 0;
      
      for (const application of stuckApplications) {
        const reminderSent = await this.processApplicationReminder(application);
        if (reminderSent) {
          remindersProcessed++;
        }
      }
      
      console.log(`Email reminder check completed. Processed ${remindersProcessed} reminders for ${stuckApplications.length} stuck applications.`);
      return { processed: remindersProcessed, total: stuckApplications.length };
    } catch (error) {
      console.error('Error in email reminder check:', error);
      throw error;
    }
  }

  /**
   * Get applications stuck at various stages for more than 7 days
   */
  async getStuckApplications() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - this.reminderThresholdDays);
    const sevenDaysAgoMs = sevenDaysAgo.getTime(); // Convert to milliseconds for comparison

    // Simplified query - use updated_at as the primary indicator for staleness
    // If status_history exists, we can use it for more precise timing later
    const query = `
      SELECT a.*
      FROM applications a
      WHERE a.status IN ('ccc_review', 'ccc_associate_dean_review', 'awaiting_primary_approval')
      AND a.updated_at < ?
    `;
    
    const rows = await db.all(query, [sevenDaysAgoMs]);
    
    return rows.map(row => {
      const app = new Application(row);
      // Create facultyMember object from embedded data for compatibility
      app.facultyMember = {
        name: app.facultyName,
        email: app.facultyEmail,
        title: app.facultyTitle,
        department: app.facultyDepartment,
        college: app.facultyCollege,
        institution: app.facultyInstitution
      };
      app.lastStatusChange = row.updated_at; // Use updated_at as fallback
      return app;
    });
  }

  /**
   * Process reminder for a specific application
   */
  async processApplicationReminder(application) {
    try {
      // Check if reminder was already sent recently (within 7 days)
      const recentReminder = await this.wasRecentReminderSent(application.id);
      if (recentReminder) {
        console.log(`Skipping reminder for ${application.id} - recent reminder already sent`);
        return false;
      }

      const reminderInfo = this.determineReminderRecipient(application);
      if (!reminderInfo) {
        console.log(`No reminder recipient determined for application ${application.id} with status ${application.status}`);
        return false;
      }

      // Send reminder email
      await this.sendReminderEmail(application, reminderInfo);
      
      // Log the reminder
      await this.logReminderSent(application.id, reminderInfo.recipient, reminderInfo.type);
      
      console.log(`Reminder sent for application ${application.id} to ${reminderInfo.recipient}`);
      return true;
    } catch (error) {
      console.error(`Error sending reminder for application ${application.id}:`, error);
      return false;
    }
  }

  /**
   * Determine who should receive the reminder based on application status
   */
  determineReminderRecipient(application) {
    switch (application.status) {
      case 'ccc_review':
        return {
          recipient: 'ccc@vanderbilt.edu', // CCC staff email
          type: 'ccc_review_reminder',
          recipientName: 'CCC Review Team',
          actionRequired: 'review and approve this application'
        };
      
      case 'ccc_associate_dean_review':
        return {
          recipient: 'ccc.associate.dean@vanderbilt.edu', // CCC Associate Dean email
          type: 'associate_dean_reminder',
          recipientName: 'CCC Associate Dean',
          actionRequired: 'review and approve this application'
        };
      
      case 'awaiting_primary_approval':
        // Determine primary approver based on application details
        const primaryApprover = this.getPrimaryApprover(application);
        return {
          recipient: primaryApprover.email,
          type: 'primary_approval_reminder',
          recipientName: primaryApprover.name,
          actionRequired: 'provide your approval decision'
        };
      
      default:
        return null;
    }
  }

  /**
   * Determine the primary approver for the application
   */
  getPrimaryApprover(application) {
    // For applications with departments, check department chair first
    if (application.hasDepartments && application.departmentChairEmail) {
      return {
        name: application.departmentChairName || 'Department Chair',
        email: application.departmentChairEmail
      };
    }

    // Check division chair
    if (application.divisionChairEmail) {
      return {
        name: application.divisionChairName || 'Division Chair',
        email: application.divisionChairEmail
      };
    }

    // Fall back to dean
    return {
      name: application.deanName || 'Dean',
      email: application.deanEmail
    };
  }

  /**
   * Check if a reminder was sent recently for this application
   */
  async wasRecentReminderSent(applicationId) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const query = `
      SELECT COUNT(*) as count 
      FROM email_reminders 
      WHERE application_id = ? 
      AND sent_at > ?
    `;
    
    try {
      const result = await db.get(query, [applicationId, sevenDaysAgo.toISOString()]);
      return result.count > 0;
    } catch (error) {
      // If table doesn't exist yet, return false
      console.log('Email reminders table may not exist yet, assuming no recent reminders');
      return false;
    }
  }

  /**
   * Send the actual reminder email
   */
  async sendReminderEmail(application, reminderInfo) {
    const daysStuck = this.calculateDaysStuck(application);
    
    // For development, restrict emails to test address
    const actualRecipient = process.env.NODE_ENV === 'production' 
      ? reminderInfo.recipient 
      : 'tristan.v.van@vanderbilt.edu';

    const subject = `Reminder: CCC Secondary Appointment Application Pending Review - ${application.id}`;
    
    const emailContent = this.generateReminderEmailContent(application, reminderInfo, daysStuck);

    await this.emailService.sendEmail(
      actualRecipient,
      subject,
      emailContent.text,
      emailContent.html
    );
  }

  /**
   * Calculate how many days the application has been stuck
   */
  calculateDaysStuck(application) {
    const lastChange = application.lastStatusChange 
      ? new Date(application.lastStatusChange)
      : new Date(application.updatedAt);
    
    const daysDiff = Math.floor((new Date() - lastChange) / (1000 * 60 * 60 * 24));
    return daysDiff;
  }

  /**
   * Generate reminder email content
   */
  generateReminderEmailContent(application, reminderInfo, daysStuck) {
    const applicationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signature/${application.id}?approver=${encodeURIComponent(reminderInfo.recipient)}&token=reminder`;

    const text = `
Dear ${reminderInfo.recipientName},

This is a reminder that a College of Connected Computing (CCC) secondary appointment application has been pending your review for ${daysStuck} days.

Application Details:
- Application ID: ${application.id}
- Faculty Member: ${application.facultyMember.name} (${application.facultyMember.email})
- Title: ${application.facultyMember.title}
- Department: ${application.facultyMember.department || 'N/A'}
- College: ${application.facultyMember.college}
- Institution: ${application.facultyMember.institution === 'vanderbilt' ? 'Vanderbilt University' : 'VUMC'}
- Current Status: ${this.getStatusDisplayName(application.status)}
- Submitted: ${new Date(application.submittedAt).toLocaleDateString()}

Action Required: Please ${reminderInfo.actionRequired}.

To review this application, please visit: ${applicationUrl}

If you have already processed this application or if there are any issues, please contact the CCC administrative team.

Thank you for your prompt attention to this matter.

Best regards,
CCC Faculty Affairs 
College of Connected Computing 
Vanderbilt University 
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #8B1538; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .details { background-color: white; padding: 15px; border-left: 4px solid #8B1538; margin: 15px 0; }
    .button { display: inline-block; background-color: #8B1538; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    .urgent { color: #d32f2f; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CCC Application Review Reminder</h1>
    </div>
    
    <div class="content">
      <p>Dear ${reminderInfo.recipientName},</p>
      
      <p class="urgent">This is a reminder that a College of Connected Computing (CCC) secondary appointment application has been pending your review for ${daysStuck} days.</p>
      
      <div class="details">
        <h3>Application Details</h3>
        <ul>
          <li><strong>Application ID:</strong> ${application.id}</li>
          <li><strong>Faculty Member:</strong> ${application.facultyMember.name} (${application.facultyMember.email})</li>
          <li><strong>Title:</strong> ${application.facultyMember.title}</li>
          <li><strong>Department:</strong> ${application.facultyMember.department || 'N/A'}</li>
          <li><strong>College:</strong> ${application.facultyMember.college}</li>
          <li><strong>Institution:</strong> ${application.facultyMember.institution === 'vanderbilt' ? 'Vanderbilt University' : 'VUMC'}</li>
          <li><strong>Current Status:</strong> ${this.getStatusDisplayName(application.status)}</li>
          <li><strong>Submitted:</strong> ${new Date(application.submittedAt).toLocaleDateString()}</li>
        </ul>
      </div>
      
      <p><strong>Action Required:</strong> Please ${reminderInfo.actionRequired}.</p>
      
      <a href="${applicationUrl}" class="button">Review Application</a>
      
      <p>If you have already processed this application or if there are any issues, please contact the CCC administrative team.</p>
      
      <p>Thank you for your prompt attention to this matter.</p>
      
      <p>Best regards,<br>
      CCC Faculty Affairs<br>
      College of Connected Computing<br>
      Vanderbilt University</p>
    </div>
    
    <div class="footer">
      <p>This is an automated reminder from the CCC Application Management System.</p>
    </div>
  </div>
</body>
</html>
    `;

    return { text, html };
  }

  /**
   * Get user-friendly status display name
   */
  getStatusDisplayName(status) {
    const statusMap = {
      'ccc_review': 'CCC Review',
      'ccc_associate_dean_review': 'CCC Associate Dean Review',
      'awaiting_primary_approval': 'Awaiting Primary Department Approval',
      'rejected': 'Rejected',
      'fis_entry_pending': 'FIS Entry Pending',
      'completed': 'Completed'
    };
    return statusMap[status] || status;
  }

  /**
   * Log that a reminder was sent
   */
  async logReminderSent(applicationId, recipient, reminderType) {
    // Create table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS email_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        reminder_type TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE
      )
    `;
    
    await db.run(createTableQuery);
    
    // Insert reminder log
    const insertQuery = `
      INSERT INTO email_reminders (application_id, recipient_email, reminder_type)
      VALUES (?, ?, ?)
    `;
    
    await db.run(insertQuery, [applicationId, recipient, reminderType]);
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats() {
    try {
      const query = `
        SELECT 
          reminder_type,
          COUNT(*) as count,
          DATE(sent_at) as sent_date
        FROM email_reminders 
        WHERE sent_at >= datetime('now', '-30 days')
        GROUP BY reminder_type, DATE(sent_at)
        ORDER BY sent_date DESC
      `;
      
      const stats = await db.all(query);
      return stats;
    } catch (error) {
      console.log('Email reminders table may not exist yet');
      return [];
    }
  }
}

module.exports = EmailReminderService;