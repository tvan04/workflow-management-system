const EmailService = require('./EmailService');

class NotificationService {
  constructor() {
    this.emailService = new EmailService();
  }

  async sendApplicationSubmittedNotification(application) {
    try {
      const applicantName = application.facultyName;
      const primaryAppointment = `${application.facultyCollege}, ${application.facultyDepartment || ''}`;
      
      // Send confirmation to applicant
      await this.emailService.sendConfirmationEmail(
        application.facultyEmail,
        applicantName,
        application.id,
        primaryAppointment
      );
      
      // Send CCC faculty notification
      await this.emailService.sendCCCFacultyNotification(
        applicantName,
        application.id,
        primaryAppointment
      );
      
      console.log('✅ Application submitted notifications sent (approver emails will be sent when status changes to Primary Approval)');
    } catch (error) {
      console.error('❌ Failed to send application submitted notifications:', error.message);
      // Don't throw - we don't want to block application submission
    }
  }

  async sendStatusChangeNotification(application, newStatus) {
    try {
      const applicantName = application.facultyName;
      
      // For now, just log the status change
      // In a full implementation, you'd send different emails based on the status
      console.log(`📧 Status change notification: ${application.id} -> ${newStatus} for ${applicantName}`);
      
      // If status moved to CCC Associate Dean review, send notification
      if (newStatus === 'ccc_associate_dean_review') {
        console.log(`📧 Status changed to CCC Associate Dean Review - sending notification for ${application.id}`);
        const primaryAppointment = `${application.facultyCollege}, ${application.facultyDepartment || 'No Department'}`;
        
        // Get CCC Associate Dean email from database settings
        const cccAssociateDeanEmail = await this.getCCCAssociateDeanEmail();
        
        await this.emailService.sendApprovalNotification(
          cccAssociateDeanEmail,
          'ccc_associate_dean',
          'CCC Associate Dean',
          applicantName,
          application.id,
          primaryAppointment
        );
        console.log(`✅ CCC Associate Dean notification sent for ${application.id}`);
      }
      
      // If status moved to awaiting approval, send notifications only to those who haven't been notified
      if (newStatus === 'awaiting_primary_approval') {
        console.log(`📧 Status changed to Primary Approval - checking for new approver notifications for ${application.id}`);
        const primaryAppointment = `${application.facultyCollege}, ${application.facultyDepartment || 'No Department'}`;
        
        // Get existing approval tokens to see who has already been notified
        const existingTokens = await this.getExistingApprovalTokens(application.id);
        const notifiedEmails = existingTokens.map(token => token.approver_email.toLowerCase());
        
        let notificationsSent = 0;

        // Send to department chair if exists and not already notified
        if (application.departmentChairName && application.departmentChairEmail && 
            !notifiedEmails.includes(application.departmentChairEmail.toLowerCase())) {
          await this.emailService.sendApprovalNotification(
            application.departmentChairEmail,
            'department_chair',
            application.departmentChairName,
            applicantName,
            application.id,
            primaryAppointment
          );
          notificationsSent++;
        }

        // Send to division chair if exists and not already notified
        if (application.divisionChairName && application.divisionChairEmail && 
            !notifiedEmails.includes(application.divisionChairEmail.toLowerCase())) {
          await this.emailService.sendApprovalNotification(
            application.divisionChairEmail,
            'division_chair',
            application.divisionChairName,
            applicantName,
            application.id,
            primaryAppointment
          );
          notificationsSent++;
        }

        // Send to dean if exists and not already notified
        if (application.deanName && application.deanEmail && 
            !notifiedEmails.includes(application.deanEmail.toLowerCase())) {
          await this.emailService.sendApprovalNotification(
            application.deanEmail,
            'dean',
            application.deanName,
            applicantName,
            application.id,
            primaryAppointment
          );
          notificationsSent++;
        }

        // Send to senior associate dean if exists and not already notified
        if (application.seniorAssociateDeanName && application.seniorAssociateDeanEmail && 
            !notifiedEmails.includes(application.seniorAssociateDeanEmail.toLowerCase())) {
          await this.emailService.sendApprovalNotification(
            application.seniorAssociateDeanEmail,
            'senior_associate_dean',
            application.seniorAssociateDeanName,
            applicantName,
            application.id,
            primaryAppointment
          );
          notificationsSent++;
        }

        if (notificationsSent > 0) {
          console.log(`✅ Primary approval notifications sent to ${notificationsSent} NEW recipients for ${application.id}`);
        } else {
          console.log(`ℹ️ No new primary approver notifications needed for application ${application.id} - all have been notified already`);
        }
      }
      
      // If status moved to FIS entry pending, send notification to CCC faculty
      if (newStatus === 'fis_entry_pending') {
        console.log(`📧 Status changed to FIS Entry Pending - sending notification for ${application.id}`);
        const primaryAppointment = `${application.facultyCollege}, ${application.facultyDepartment || 'No Department'}`;
        
        await this.emailService.sendFISEntryNotification(
          applicantName,
          application.id,
          primaryAppointment
        );
        console.log(`✅ FIS entry notification sent for ${application.id}`);
      }
      
      // If status moved to completed, send confirmation email to applicant
      if (newStatus === 'completed') {
        console.log(`📧 Status changed to Completed - sending confirmation email for ${application.id}`);
        const primaryAppointment = `${application.facultyCollege}, ${application.facultyDepartment || 'No Department'}`;
        
        await this.emailService.sendCompletionConfirmationEmail(
          application.facultyEmail,
          applicantName,
          application.id,
          primaryAppointment,
          application.primaryAppointmentEndDate
        );
        console.log(`✅ Completion confirmation email sent for ${application.id}`);
      }
      
      // If status moved to rejected, send rejection notification to applicant
      if (newStatus === 'rejected') {
        console.log(`📧 Status changed to Rejected - sending rejection notification for ${application.id}`);
        const primaryAppointment = `${application.facultyCollege}, ${application.facultyDepartment || 'No Department'}`;
        
        await this.emailService.sendRejectionNotificationEmail(
          application.facultyEmail,
          applicantName,
          application.id,
          primaryAppointment
        );
        console.log(`✅ Rejection notification email sent for ${application.id}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to send status change notification:', error.message);
      // Don't throw - we don't want to block status updates
    }
  }

  async sendReminderNotification(application) {
    try {
      // For now, just log
      console.log(`📧 Reminder notification for application: ${application.id}`);
    } catch (error) {
      console.error('❌ Failed to send reminder notification:', error.message);
    }
  }

  async getCCCAssociateDeanEmail() {
    try {
      const db = require('../config/database');
      const result = await db.get('SELECT value FROM system_settings WHERE key = ?', ['ccc_associate_dean_email']);
      return result ? result.value : 'associate.dean.ccc@vanderbilt.edu'; // fallback default
    } catch (error) {
      console.error('❌ Failed to get CCC Associate Dean email from settings:', error.message);
      return 'associate.dean.ccc@vanderbilt.edu'; // fallback default
    }
  }

  async getExistingApprovalTokens(applicationId) {
    try {
      const db = require('../config/database');
      const tokens = await db.all(
        'SELECT approver_email, approver_role, approver_name FROM approval_tokens WHERE application_id = ?',
        [applicationId]
      );
      return tokens || [];
    } catch (error) {
      console.error('❌ Failed to get existing approval tokens:', error.message);
      return [];
    }
  }
}

module.exports = NotificationService;