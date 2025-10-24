const nodemailer = require('nodemailer');
const db = require('../config/database');

class NotificationService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // In development, we'll use a test transporter that logs instead of sending
    if (process.env.NODE_ENV === 'development') {
      this.transporter = {
        sendMail: async (mailOptions) => {
          console.log('\n📧 ========== EMAIL NOTIFICATION ==========');
          console.log('TO:', mailOptions.to);
          console.log('SUBJECT:', mailOptions.subject);
          console.log('MESSAGE:');
          console.log(mailOptions.text);
          console.log('==========================================\n');
          
          // Also save to a log file for testing
          const fs = require('fs');
          const path = require('path');
          const logDir = path.join(__dirname, '../logs');
          if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
          }
          
          const logEntry = {
            timestamp: new Date().toISOString(),
            to: mailOptions.to,
            subject: mailOptions.subject,
            text: mailOptions.text
          };
          
          const logFile = path.join(logDir, 'emails.log');
          fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
          
          return { messageId: 'dev-' + Date.now() };
        }
      };
    } else {
      // Production email configuration
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  async sendEmail(to, subject, text, html = null) {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'ccc-workflow@vanderbilt.edu',
        to,
        subject,
        text,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Log the notification
      await this.logNotification({
        recipientEmail: to,
        subject,
        status: 'sent'
      });

      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      
      // Log the failed notification
      await this.logNotification({
        recipientEmail: to,
        subject,
        status: 'failed',
        errorMessage: error.message
      });

      throw error;
    }
  }

  async logNotification(notificationData) {
    try {
      const query = `
        INSERT INTO notifications_log (
          application_id, template_id, recipient_email, subject, status, error_message
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await db.run(query, [
        notificationData.applicationId || null,
        notificationData.templateId || null,
        notificationData.recipientEmail,
        notificationData.subject,
        notificationData.status,
        notificationData.errorMessage || null
      ]);
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  async sendApplicationSubmittedNotification(application) {
    const facultyEmail = application.facultyMember.email;
    const facultyName = application.facultyMember.name;
    
    // Email to faculty member
    const facultySubject = 'Secondary Appointment Application Submitted - CCC';
    const facultyText = `
Dear ${facultyName},

Thank you for submitting your secondary appointment application to the College of Connected Computing (CCC).

Application Details:
- Application ID: ${application.id}
- Submitted: ${new Date(application.submittedAt).toLocaleDateString()}
- Status: Under CCC Review

Your application is now in the CCC review queue. You will receive email notifications as your application progresses through the approval process.

You can check your application status at any time using the online status tracker.

If you have any questions, please contact the CCC Dean's Office.

Best regards,
CCC Administrative Team
College of Connected Computing
Vanderbilt University
    `;

    await this.sendEmail(facultyEmail, facultySubject, facultyText);

    // Email to CCC staff
    const staffSubject = `New Secondary Appointment Application - ${facultyName}`;
    const staffText = `
A new secondary appointment application has been submitted.

Faculty Member: ${facultyName} (${facultyEmail})
College: ${application.facultyMember.college}
Department: ${application.facultyMember.department || 'N/A'}
Institution: ${application.facultyMember.institution.toUpperCase()}
Application ID: ${application.id}
Submitted: ${new Date(application.submittedAt).toLocaleDateString()}

Please review the application in the CCC workflow management system.

Rationale Summary: ${application.rationale.substring(0, 200)}...
    `;

    // Send to CCC staff (in a real system, this would be configurable)
    const cccStaffEmails = ['ccc-staff@vanderbilt.edu']; // This should be configurable
    for (const email of cccStaffEmails) {
      await this.sendEmail(email, staffSubject, staffText);
    }
  }

  async sendStatusChangeNotification(application, newStatus) {
    const facultyEmail = application.facultyMember.email;
    const facultyName = application.facultyMember.name;
    
    const statusMessages = {
      'ccc_review': 'Your application is now under CCC review.',
      'faculty_vote': 'Your application is proceeding to faculty vote.',
      'awaiting_primary_approval': 'Your application is awaiting approval from your primary college.',
      'approved': 'Congratulations! Your secondary appointment has been approved.',
      'rejected': 'We regret to inform you that your application was not approved.',
      'fis_entry_pending': 'Your appointment is approved and being entered into the Faculty Information System.',
      'completed': 'Your secondary appointment is now active!'
    };

    const statusMessage = statusMessages[newStatus] || 'Your application status has been updated.';
    
    const subject = `Application Status Update - ${application.id}`;
    const text = `
Dear ${facultyName},

Your secondary appointment application status has been updated.

Application ID: ${application.id}
New Status: ${newStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

${statusMessage}

Current Approver: ${application.currentApprover || 'None'}

You can track your application progress using the online status tracker.

Best regards,
CCC Administrative Team
College of Connected Computing
Vanderbilt University
    `;

    await this.sendEmail(facultyEmail, subject, text);

    // If status is awaiting_primary_approval, notify the approver
    if (newStatus === 'awaiting_primary_approval') {
      await this.sendApprovalRequestNotification(application);
    }
  }

  async sendApprovalRequestNotification(application) {
    const facultyName = application.facultyMember.name;
    const facultyCollege = application.facultyMember.college;
    
    // Determine who to send the approval request to
    let approverEmail, approverName, approverRole;
    
    if (application.hasDepartments && application.departmentChairEmail) {
      approverEmail = application.departmentChairEmail;
      approverName = application.departmentChairName;
      approverRole = 'Department Chair';
    } else {
      approverEmail = application.deanEmail;
      approverName = application.deanName;
      approverRole = 'Dean';
    }

    const subject = `Secondary Appointment Approval Request - ${facultyName}`;
    const text = `
Dear ${approverName},

A faculty member from your ${approverRole === 'Department Chair' ? 'department' : 'college'} has applied for a secondary appointment with the College of Connected Computing (CCC) and requires your approval to proceed.

Faculty Member: ${facultyName}
College: ${facultyCollege}
Department: ${application.facultyMember.department || 'N/A'}
Application ID: ${application.id}
Submitted: ${new Date(application.submittedAt).toLocaleDateString()}

Rationale for Secondary Appointment:
${application.rationale}

Please review this request and provide your approval or feedback. You can access the full application details through the CCC workflow management system.

If you have any questions about this request, please contact the CCC Dean's Office.

Best regards,
CCC Administrative Team
College of Connected Computing
Vanderbilt University
    `;

    await this.sendEmail(approverEmail, subject, text);
  }

  async sendReminderNotification(application) {
    const daysSinceUpdate = Math.floor((new Date() - new Date(application.updatedAt)) / (1000 * 60 * 60 * 24));
    
    // Send reminder to current approver
    if (application.currentApprover && application.status === 'awaiting_primary_approval') {
      let approverEmail;
      if (application.hasDepartments && application.departmentChairEmail) {
        approverEmail = application.departmentChairEmail;
      } else {
        approverEmail = application.deanEmail;
      }

      const subject = `Reminder: Secondary Appointment Approval Needed - ${application.facultyMember.name}`;
      const text = `
This is a friendly reminder that a secondary appointment application requires your attention.

Faculty Member: ${application.facultyMember.name}
Application ID: ${application.id}
Days Since Last Update: ${daysSinceUpdate}
Status: Awaiting Primary Approval

The application has been pending for ${daysSinceUpdate} days. Please review and provide your approval or feedback at your earliest convenience.

Thank you for your attention to this matter.

Best regards,
CCC Administrative Team
      `;

      await this.sendEmail(approverEmail, subject, text);
    }

    // Also send reminder to faculty member
    const facultySubject = `Application Status Reminder - ${application.id}`;
    const facultyText = `
Dear ${application.facultyMember.name},

This is a status update for your secondary appointment application.

Application ID: ${application.id}
Current Status: ${application.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
Days Since Last Update: ${daysSinceUpdate}
Current Approver: ${application.currentApprover || 'CCC Staff'}

Your application is still being processed. We will notify you as soon as there is an update.

Best regards,
CCC Administrative Team
    `;

    await this.sendEmail(application.facultyMember.email, facultySubject, facultyText);
  }

  async sendBulkReminders() {
    try {
      // Find all stalled applications (more than 7 days without update)
      const stalledQuery = `
        SELECT a.*, f.name as faculty_name, f.email as faculty_email, 
               f.title as faculty_title, f.department as faculty_department,
               f.college as faculty_college, f.institution as faculty_institution
        FROM applications a
        JOIN faculty_members f ON a.faculty_member_id = f.id
        WHERE a.status NOT IN ('completed', 'rejected') 
        AND datetime(a.updated_at) < datetime('now', '-7 days')
        ORDER BY a.updated_at ASC
      `;

      const stalledApplications = await db.all(stalledQuery);
      
      console.log(`Found ${stalledApplications.length} stalled applications`);
      
      for (const app of stalledApplications) {
        const application = {
          id: app.id,
          status: app.status,
          updatedAt: app.updated_at,
          currentApprover: app.current_approver,
          hasDepartments: app.has_departments,
          departmentChairEmail: app.department_chair_email,
          deanEmail: app.dean_email,
          facultyMember: {
            name: app.faculty_name,
            email: app.faculty_email
          }
        };

        await this.sendReminderNotification(application);
      }

      return stalledApplications.length;
    } catch (error) {
      console.error('Failed to send bulk reminders:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();