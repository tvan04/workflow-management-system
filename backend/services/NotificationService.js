const EmailService = require('./EmailService');

class NotificationService {
  constructor() {
    this.emailService = new EmailService();
  }

  async sendApplicationSubmittedNotification(application) {
    try {
      const facultyMember = application.facultyMember;
      const applicantName = facultyMember.name;
      const primaryAppointment = `${facultyMember.college}, ${facultyMember.department || ''}`;
      
      // Send confirmation to applicant
      await this.emailService.sendConfirmationEmail(
        facultyMember.email,
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
      const facultyMember = application.facultyMember;
      const applicantName = facultyMember.name;
      
      // For now, just log the status change
      // In a full implementation, you'd send different emails based on the status
      console.log(`📧 Status change notification: ${application.id} -> ${newStatus} for ${applicantName}`);
      
      // If status moved to CCC Associate Dean review, send notification
      if (newStatus === 'ccc_associate_dean_review') {
        console.log(`📧 Status changed to CCC Associate Dean Review - sending notification for ${application.id}`);
        const primaryAppointment = `${facultyMember.college}, ${facultyMember.department || 'No Department'}`;
        
        // Get CCC Associate Dean email from database settings
        const cccAssociateDeanEmail = await this.getCCCAssociateDeanEmail();
        
        await this.emailService.sendCCCAssociateDeanNotification(
          cccAssociateDeanEmail,
          applicantName,
          application.id,
          primaryAppointment
        );
        console.log(`✅ CCC Associate Dean notification sent for ${application.id}`);
      }
      
      // If status moved to awaiting approval, send new approval notifications
      if (newStatus === 'awaiting_primary_approval') {
        console.log(`📧 Status changed to Primary Approval - sending approver notifications for ${application.id}`);
        const primaryAppointment = `${facultyMember.college}, ${facultyMember.department || 'No Department'}`;
        const approverEmails = this.emailService.getApproverEmails(application);
        
        if (approverEmails.length > 0) {
          await this.emailService.sendApprovalNotification(
            approverEmails,
            applicantName,
            application.id,
            primaryAppointment
          );
          console.log(`✅ Approver notifications sent to ${approverEmails.length} recipients for ${application.id}`);
        } else {
          console.log(`⚠️ No approver emails found for application ${application.id}`);
        }
      }
      
      // If status moved to FIS entry pending, send notification to CCC faculty
      if (newStatus === 'fis_entry_pending') {
        console.log(`📧 Status changed to FIS Entry Pending - sending notification for ${application.id}`);
        const primaryAppointment = `${facultyMember.college}, ${facultyMember.department || 'No Department'}`;
        
        await this.emailService.sendFISEntryNotification(
          applicantName,
          application.id,
          primaryAppointment
        );
        console.log(`✅ FIS entry notification sent for ${application.id}`);
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
}

module.exports = NotificationService;