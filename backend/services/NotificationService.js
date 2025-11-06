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
}

module.exports = NotificationService;