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

  async sendStatusChangeNotification(application, newStatus, previousApproverRole = null, rejectedBy = null) {
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
          primaryAppointment,
          application.facultyCollege
        );
        console.log(`✅ CCC Associate Dean notification sent for ${application.id}`);
      }
      
      // If status moved to awaiting approval, send notification to next approver in sequence
      if (newStatus === 'awaiting_primary_approval') {
        console.log(`📧 Status changed to Primary Approval - finding next approver for ${application.id}`);
        const primaryAppointment = `${application.facultyCollege}, ${application.facultyDepartment || 'No Department'}`;
        
        // Get the next approver in the hierarchy sequence
        const nextApprover = await this.getNextApproverInSequence(application);
        
        if (nextApprover) {
          console.log(`📧 Sending notification to next approver: ${nextApprover.name} (${nextApprover.role}) for ${application.id}`);
          
          await this.emailService.sendApprovalNotification(
            nextApprover.email,
            nextApprover.role,
            nextApprover.name,
            applicantName,
            application.id,
            primaryAppointment,
            application.facultyCollege
          );
          
          console.log(`✅ Sequential approval notification sent to ${nextApprover.name} for ${application.id}`);
        } else {
          console.log(`ℹ️ No next approver found in sequence for application ${application.id} - all approvals may be complete`);
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
      
      // If status moved to rejected, send rejection notification to applicant and CCC faculty
      if (newStatus === 'rejected') {
        console.log(`📧 REJECTION: Status changed to Rejected - sending rejection notifications for ${application.id}`);
        console.log(`📧 REJECTION: Applicant email: ${application.facultyEmail}, Name: ${applicantName}`);
        const primaryAppointment = `${application.facultyCollege}, ${application.facultyDepartment || 'No Department'}`;
        
        // Send notification to applicant
        await this.emailService.sendRejectionNotificationEmail(
          application.facultyEmail,
          applicantName,
          application.id,
          primaryAppointment
        );
        console.log(`✅ REJECTION: Rejection notification email sent to applicant for ${application.id}`);
        
        // Send notification to CCC faculty
        await this.emailService.sendCCCRejectionNotificationEmail(
          applicantName,
          application.id,
          primaryAppointment,
          rejectedBy
        );
        console.log(`✅ REJECTION: CCC faculty notification email sent for ${application.id}`);
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

  // Helper function to get approval hierarchy for an application
  getApprovalHierarchy(application) {
    // Get college configuration to determine required approvers and their order
    const collegeRequirements = this.getCollegeRequirements(application.facultyCollege);
    const requiredApprovers = collegeRequirements.requiredApprovers || [];
    
    const hierarchy = [];
    
    // Build hierarchy based on required approvers order
    for (const approverType of requiredApprovers) {
      switch (approverType) {
        case 'departmentChair':
          if (application.departmentChairName && application.departmentChairEmail) {
            hierarchy.push({
              role: 'department_chair',
              name: application.departmentChairName,
              email: application.departmentChairEmail
            });
          }
          break;
        
        case 'associateDean':
          if (application.seniorAssociateDeanName && application.seniorAssociateDeanEmail) {
            hierarchy.push({
              role: 'senior_associate_dean',
              name: application.seniorAssociateDeanName,
              email: application.seniorAssociateDeanEmail
            });
          }
          break;
        
        case 'dean':
          if (application.deanName && application.deanEmail) {
            hierarchy.push({
              role: 'dean',
              name: application.deanName,
              email: application.deanEmail
            });
          }
          break;
        
        case 'viceDean':
          if (application.deanName && application.deanEmail) {
            hierarchy.push({
              role: 'viceDean', // Use viceDean role for proper email handling
              name: application.deanName,
              email: application.deanEmail
            });
          }
          break;
      }
    }
    
    // Also add division chair if it exists (alternative to department chair)
    if (application.divisionChairName && application.divisionChairEmail && !hierarchy.some(h => h.role === 'department_chair')) {
      hierarchy.unshift({
        role: 'division_chair',
        name: application.divisionChairName,
        email: application.divisionChairEmail
      });
    }
    
    return hierarchy;
  }

  // Helper function to get college requirements (copied from applications.js)
  getCollegeRequirements(collegeName) {
    const colleges = {
      'School of Engineering': {
        hasDepartments: true,
        requiredApprovers: ['departmentChair', 'dean']
      },
      'College of Arts & Science': {
        hasDepartments: true,
        requiredApprovers: ['departmentChair', 'associateDean']
      },
      'School of Medicine - Basic Sciences': {
        hasDepartments: true,
        requiredApprovers: ['departmentChair']
      },
      'Owen Graduate School of Management': {
        hasDepartments: false,
        requiredApprovers: ['associateDean', 'dean']
      },
      'Blair School of Music': {
        hasDepartments: false,
        requiredApprovers: ['associateDean', 'dean']
      },
      'Peabody College': {
        hasDepartments: true,
        requiredApprovers: ['departmentChair', 'dean']
      },
      'School of Nursing': {
        hasDepartments: false,
        requiredApprovers: ['dean']
      },
      'Law School': {
        hasDepartments: false,
        requiredApprovers: ['viceDean']
      },
      'Divinity School': {
        hasDepartments: false,
        requiredApprovers: ['dean']
      },
    };
    
    return colleges[collegeName] || { hasDepartments: true, requiredApprovers: ['departmentChair'] };
  }

  // Helper function to get completed approvals for an application
  async getCompletedApprovals(applicationId) {
    try {
      const db = require('../config/database');
      const approvals = await db.all(
        'SELECT approver_role, approver_name, used_at FROM approval_tokens WHERE application_id = ? AND used = 1',
        [applicationId]
      );
      return approvals || [];
    } catch (error) {
      console.error('❌ Failed to get completed approvals:', error.message);
      return [];
    }
  }

  // Helper function to determine next approver in sequence
  async getNextApproverInSequence(application) {
    const hierarchy = this.getApprovalHierarchy(application);
    const completedApprovals = await this.getCompletedApprovals(application.id);
    const completedRoles = completedApprovals.map(approval => approval.approver_role);
    
    // Find the first approver in hierarchy who hasn't completed their approval
    for (const approver of hierarchy) {
      if (!completedRoles.includes(approver.role)) {
        return approver;
      }
    }
    
    return null; // All approvers have completed their approvals
  }
}

module.exports = NotificationService;