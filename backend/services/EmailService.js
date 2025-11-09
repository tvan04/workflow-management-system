const axios = require('axios');
require('dotenv').config();

class EmailService {
  constructor() {
    this.apiKey = process.env.REACT_APP_AMPLIFY_API_KEY;
    this.apiUrl = 'https://prod-api.vanderbilt.ai/microsoft/integrations/send_mail';
    this.cccFacultyEmail = process.env.CCC_FACULTY_EMAIL; // Configurable CCC faculty email
    
    if (!this.apiKey) {
      console.warn('Warning: REACT_APP_AMPLIFY_API_KEY not found in environment variables');
    }
    if (!this.cccFacultyEmail) {
      console.warn('Warning: CCC_FACULTY_EMAIL not found in environment variables');
    }
  }

  async sendApprovalNotification(approverEmails, applicantName, applicationId, primaryAppointment) {
    if (!this.apiKey) {
      throw new Error('Email API key not configured');
    }

    if (!approverEmails || approverEmails.length === 0) {
      console.log('No approver emails provided, skipping email notification');
      return;
    }

    // Filter out any null/undefined emails and restrict to test email only
    const validEmails = approverEmails.filter(email => email && email.trim());

    // Send individual emails with personalized approval links
    const results = [];
    
    for (const approverEmail of validEmails) {
      // Generate approval token (simple approach - in production use JWT or secure tokens)
      const approvalToken = Buffer.from(`${applicationId}:${approverEmail}:${Date.now()}`).toString('base64');
      
      // Construct personalized approval link
      const approvalLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signature/${applicationId}?approver=${encodeURIComponent(approverEmail)}&token=${approvalToken}`;
      
      const subject = `Secondary Appointment Application - Approval Required`;
      const body = `
        <p>Dear Approver,</p>
        
        <p>A faculty member from your school and/or department has submitted an application for a secondary appointment at the College of Connected Computing at Vanderbilt University. Your approval is required to proceed with this request.</p>
        
        <p><strong>Applicant:</strong> ${applicantName}<br/>
        <strong>Application ID:</strong> ${applicationId}<br/>
        <strong>Primary Appointment:</strong> ${primaryAppointment || 'Not specified'}</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px;">
          <p style="margin: 0 0 10px 0; font-weight: bold;">Click the link below to review and approve/deny this application:</p>
          <p style="margin: 0;"><a href="${approvalLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Review Application & Provide Decision</a></p>
        </div>
        
        <p style="font-size: 12px; color: #666;">This link is personalized for you (${approverEmail}) and will allow you to view the complete application and provide your digital signature for approval or denial.</p>
        
        <p>If you have any questions regarding this secondary appointment request, please contact the Faculty Affairs office at <a href="mailto:cccfacultyaffairs@vanderbilt.edu">cccfacultyaffairs@vanderbilt.edu</a>.</p>
        
        <p>Thank you for your prompt attention to this matter.</p>
        
        <p>Best regards,<br/>
        CCC Faculty Affairs<br/>
        Vanderbilt University</p>
      `;

      const payload = {
        data: {
          subject: subject,
          body: body,
          to_recipients: [approverEmail],
          cc_recipients: [],
          bcc_recipients: [],
          importance: 'normal'
        }
      };

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      };

      try {
        console.log(`Sending personalized approval notification to: ${approverEmail}`);
        console.log(`Approval link: ${approvalLink}`);
        
        const response = await axios.post(this.apiUrl, payload, { 
          headers,
          timeout: 30000
        });

        if (response.status === 200) {
          console.log(`✅ Approval notification sent successfully to ${approverEmail}`);
          results.push({
            success: true,
            recipient: approverEmail,
            messageId: response.data?.data?.id || 'unknown',
            approvalLink: approvalLink
          });
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`❌ Failed to send approval notification to ${approverEmail}:`, error.message);
        
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        
        results.push({
          success: false,
          error: error.message,
          recipient: approverEmail
        });
      }
    }

    // Return summary of all email attempts
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`📧 Approval notification summary: ${successCount}/${totalCount} emails sent successfully`);
    
    return {
      success: successCount > 0,
      totalSent: successCount,
      totalAttempted: totalCount,
      results: results
    };
  }

  async sendCCCFacultyNotification(applicantName, applicationId, primaryAppointment) {
    if (!this.apiKey) {
      throw new Error('Email API key not configured');
    }

    if (!this.cccFacultyEmail) {
      throw new Error('CCC Faculty Email not configured');
    }

    const subject = `New Secondary Appointment Application - CCC Review Required`;
    const body = `
      <p>Dear CCC Faculty,</p>
      
      <p>A new application for a secondary appointment at the College of Connected Computing has been submitted and requires your review.</p>
      
      <p><strong>Application ID:</strong> ${applicationId}<br/>
      <strong>Applicant:</strong> ${applicantName}<br/>
      <strong>Primary Appointment:</strong> ${primaryAppointment || 'Not specified'}</p>
      
      <p>Please log into the workflow management system to review this application.</p>
      
      <p>If you have any questions regarding this application, please contact the Faculty Affairs office at <a href="mailto:cccfacultyaffairs@vanderbilt.edu">cccfacultyaffairs@vanderbilt.edu</a>.</p>
      
      <p>Thank you for your prompt attention to this matter.</p>
      
      <p>Best regards,<br/>
      CCC Faculty Affairs<br/>
      Vanderbilt University</p>
    `;

    const payload = {
      data: {
        subject: subject,
        body: body,
        to_recipients: [this.cccFacultyEmail],
        cc_recipients: [],
        bcc_recipients: [],
        importance: 'normal'
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    try {
      console.log(`Sending CCC faculty notification email to: ${this.cccFacultyEmail}`);
      
      const response = await axios.post(this.apiUrl, payload, { 
        headers,
        timeout: 30000
      });

      if (response.status === 200) {
        console.log('✅ CCC faculty notification email sent successfully');
        return {
          success: true,
          recipient: this.cccFacultyEmail,
          messageId: response.data?.data?.id || 'unknown'
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to send CCC faculty notification email:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // Don't throw the error - we don't want email failures to block application submission
      return {
        success: false,
        error: error.message,
        recipient: this.cccFacultyEmail
      };
    }
  }

  async sendCCCAssociateDeanNotification(associateDeanEmail, applicantName, applicationId, primaryAppointment) {
    if (!this.apiKey) {
      throw new Error('Email API key not configured');
    }

    if (!associateDeanEmail) {
      throw new Error('CCC Associate Dean Email not configured');
    }

    // Generate approval token
    const approvalToken = Buffer.from(`${applicationId}:${associateDeanEmail}:${Date.now()}`).toString('base64');
    
    // Construct personalized approval link
    const approvalLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signature/${applicationId}?approver=${encodeURIComponent(associateDeanEmail)}&token=${approvalToken}`;

    const subject = `CCC Associate Dean Review Required - Secondary Appointment Application`;
    const body = `
      <p>Dear Associate Dean,</p>
      
      <p>A secondary appointment application for the College of Connected Computing has completed initial CCC review and requires your approval.</p>
      
      <p><strong>Application ID:</strong> ${applicationId}<br/>
      <strong>Applicant:</strong> ${applicantName}<br/>
      <strong>Primary Appointment:</strong> ${primaryAppointment || 'Not specified'}</p>
      
      <p>Please review and approve/deny this application using the link below:</p>
      
      <p><a href="${approvalLink}" style="background-color: #1D4ED8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Review Application</a></p>
      
      <p><strong>Important:</strong> This link is personalized for you and expires after use. Please do not share this link.</p>
      
      <p>If you have any questions regarding this application, please contact the Faculty Affairs office at <a href="mailto:cccfacultyaffairs@vanderbilt.edu">cccfacultyaffairs@vanderbilt.edu</a>.</p>
      
      <p>Thank you for your prompt attention to this matter.</p>
      
      <p>Best regards,<br/>
      CCC Faculty Affairs<br/>
      Vanderbilt University</p>
    `;

    const payload = {
      data: {
        subject: subject,
        body: body,
        to_recipients: [associateDeanEmail],
        cc_recipients: [],
        bcc_recipients: [],
        importance: 'high'
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    try {
      console.log(`Sending CCC Associate Dean notification email to: ${associateDeanEmail}`);
      
      const response = await axios.post(this.apiUrl, payload, { 
        headers,
        timeout: 30000
      });

      if (response.status === 200) {
        console.log('✅ CCC Associate Dean notification email sent successfully');
        return {
          success: true,
          recipient: associateDeanEmail,
          messageId: response.data?.data?.id || 'unknown'
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to send CCC Associate Dean notification email:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // Don't throw the error - we don't want email failures to block status updates
      return {
        success: false,
        error: error.message,
        recipient: associateDeanEmail
      };
    }
  }

  async sendConfirmationEmail(applicantEmail, applicantName, applicationId, primaryAppointment) {
    if (!this.apiKey) {
      throw new Error('Email API key not configured');
    }

    if (!applicantEmail || !applicantEmail.trim()) {
      console.log('No applicant email provided, skipping confirmation email');
      return;
    }

    const subject = `Application Submitted Successfully - ${applicationId}`;
    const body = `
      <p>Dear ${applicantName},</p>
      
      <p>Thank you for submitting your application for a secondary appointment at the College of Connected Computing at Vanderbilt University.</p>
      
      <p><strong>Application ID:</strong> ${applicationId}<br/>
      <strong>Applicant:</strong> ${applicantName}<br/>
      <strong>Primary Appointment:</strong> ${primaryAppointment || 'Not specified'}</p>
      
      <p>Your application has been successfully received and will now proceed through the approval process. You will be notified of any status updates.</p>
      
      <p>If you have any questions regarding your application, please contact the Faculty Affairs office at <a href="mailto:cccfacultyaffairs@vanderbilt.edu">cccfacultyaffairs@vanderbilt.edu</a>.</p>
      
      <p>Thank you for your interest in the College of Connected Computing.</p>
      
      <p>Best regards,<br/>
      CCC Faculty Affairs<br/>
      Vanderbilt University</p>
    `;

    const payload = {
      data: {
        subject: subject,
        body: body,
        to_recipients: [applicantEmail.trim()],
        cc_recipients: [],
        bcc_recipients: [],
        importance: 'normal'
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    try {
      console.log(`Sending confirmation email to applicant: ${applicantEmail}`);
      
      const response = await axios.post(this.apiUrl, payload, { 
        headers,
        timeout: 30000
      });

      if (response.status === 200) {
        console.log('✅ Confirmation email sent successfully to applicant');
        return {
          success: true,
          recipient: applicantEmail,
          messageId: response.data?.data?.id || 'unknown'
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to send confirmation email to applicant:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // Don't throw the error - we don't want email failures to block application submission
      return {
        success: false,
        error: error.message,
        recipient: applicantEmail
      };
    }
  }

  async sendFISEntryNotification(applicantName, applicationId, primaryAppointment) {
    if (!this.apiKey) {
      throw new Error('Email API key not configured');
    }

    if (!this.cccFacultyEmail) {
      throw new Error('CCC Faculty Email not configured');
    }

    const subject = `Application Approved - FIS Entry Required (${applicationId})`;
    const body = `
      <p>Dear CCC Faculty,</p>
      
      <p>A secondary appointment application has been fully approved and is now ready for final review and FIS (Faculty Information System) entry.</p>
      
      <p><strong>Application ID:</strong> ${applicationId}<br/>
      <strong>Applicant:</strong> ${applicantName}<br/>
      <strong>Primary Appointment:</strong> ${primaryAppointment || 'Not specified'}</p>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #155724;">Status: APPROVED</p>
        <p style="margin: 0; color: #155724;">This application has completed all required approvals and is now ready for FIS entry.</p>
      </div>
      
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Review the complete application in the workflow management system</li>
        <li>Perform final verification of all approvals</li>
        <li>Enter the approved appointment details into FIS</li>
        <li>Mark the application as completed in the system</li>
      </ol>
      
      <p>Please log into the workflow management system to access the full application details and complete the FIS entry process.</p>
            
      <p>Thank you for your prompt attention to completing this appointment process.</p>
      
      <p>Best regards,<br/>
      CCC Faculty Affairs<br/>
      Vanderbilt University</p>
    `;

    const payload = {
      data: {
        subject: subject,
        body: body,
        to_recipients: [this.cccFacultyEmail],
        cc_recipients: [],
        bcc_recipients: [],
        importance: 'high'
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    try {
      console.log(`Sending FIS entry notification email to: ${this.cccFacultyEmail}`);
      
      const response = await axios.post(this.apiUrl, payload, { 
        headers,
        timeout: 30000
      });

      if (response.status === 200) {
        console.log('✅ FIS entry notification email sent successfully');
        return {
          success: true,
          recipient: this.cccFacultyEmail,
          messageId: response.data?.data?.id || 'unknown'
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to send FIS entry notification email:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // Don't throw the error - we don't want email failures to block status updates
      return {
        success: false,
        error: error.message,
        recipient: this.cccFacultyEmail
      };
    }
  }

  async sendCompletionConfirmationEmail(applicantEmail, applicantName, applicationId, primaryAppointment, primaryAppointmentEndDate) {
    if (!this.apiKey) {
      throw new Error('Email API key not configured');
    }

    if (!applicantEmail || !applicantEmail.trim()) {
      console.log('No applicant email provided, skipping completion confirmation email');
      return;
    }

    // Format the end date for display
    let endDateText = 'Please contact CCC Faculty Affairs for specific term details';
    if (primaryAppointmentEndDate) {
      try {
        const endDate = new Date(primaryAppointmentEndDate);
        endDateText = endDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch (error) {
        console.warn('Could not format end date:', primaryAppointmentEndDate);
      }
    }

    const subject = `Secondary Appointment Approved & Complete - ${applicationId}`;
    const body = `
      <p>Dear ${applicantName},</p>
      
      <p>Congratulations! We are pleased to inform you that your application for a secondary appointment at the College of Connected Computing has been <strong>approved and completed</strong>.</p>
      
      <div style="margin: 20px 0; padding: 20px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px;">
        <h3 style="margin: 0 0 15px 0; color: #155724; font-size: 18px;">Appointment Details</h3>
        <p style="margin: 5px 0; color: #155724;"><strong>Application ID:</strong> ${applicationId}</p>
        <p style="margin: 5px 0; color: #155724;"><strong>Appointee:</strong> ${applicantName}</p>
        <p style="margin: 5px 0; color: #155724;"><strong>Primary Appointment:</strong> ${primaryAppointment || 'Not specified'}</p>
        <p style="margin: 5px 0; color: #155724;"><strong>Secondary Appointment Effective Until:</strong> ${endDateText}</p>
      </div>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff;">
        <p style="margin: 0; font-weight: bold; color: #0056b3;">Welcome to the College of Connected Computing!</p>
        <p style="margin: 5px 0 0 0; color: #0056b3;">We look forward to your contributions to our interdisciplinary mission.</p>
      </div>
      
      <p>If you have any questions about your appointment or need assistance with CCC resources, please contact the Faculty Affairs office at <a href="mailto:cccfacultyaffairs@vanderbilt.edu">cccfacultyaffairs@vanderbilt.edu</a>.</p>
      
      <p>Thank you for your interest in the College of Connected Computing, and congratulations once again on your successful appointment!</p>
      
      <p>Best regards,<br/>
      <strong>CCC Faculty Affairs</strong><br/>
      College of Connected Computing<br/>
      Vanderbilt University</p>
    `;

    const payload = {
      data: {
        subject: subject,
        body: body,
        to_recipients: [applicantEmail.trim()],
        cc_recipients: [],
        bcc_recipients: [],
        importance: 'high'
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    try {
      console.log(`Sending completion confirmation email to applicant: ${applicantEmail}`);
      
      const response = await axios.post(this.apiUrl, payload, { 
        headers,
        timeout: 30000
      });

      if (response.status === 200) {
        console.log('✅ Completion confirmation email sent successfully to applicant');
        return {
          success: true,
          recipient: applicantEmail,
          messageId: response.data?.data?.id || 'unknown'
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to send completion confirmation email to applicant:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // Don't throw the error - we don't want email failures to block status updates
      return {
        success: false,
        error: error.message,
        recipient: applicantEmail
      };
    }
  }

  async sendRejectionNotificationEmail(applicantEmail, applicantName, applicationId, primaryAppointment) {
    if (!this.apiKey) {
      throw new Error('Email API key not configured');
    }

    if (!applicantEmail || !applicantEmail.trim()) {
      console.log('No applicant email provided, skipping rejection notification email');
      return;
    }

    const subject = `Secondary Appointment Application Update - ${applicationId}`;
    const body = `
      <p>Dear ${applicantName},</p>
      
      <p>Thank you for your interest in a secondary appointment with the College of Connected Computing at Vanderbilt University.</p>
      
      <p>After careful consideration, we regret to inform you that we are unable to approve your application for a secondary appointment at this time.</p>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px;">
        <p style="margin: 5px 0; color: #721c24;"><strong>Application ID:</strong> ${applicationId}</p>
        <p style="margin: 5px 0; color: #721c24;"><strong>Applicant:</strong> ${applicantName}</p>
        <p style="margin: 5px 0; color: #721c24;"><strong>Primary Appointment:</strong> ${primaryAppointment || 'Not specified'}</p>
      </div>
      
      <p>We understand this may be disappointing news. Please know that this decision reflects the highly competitive nature of our secondary appointment program and current capacity constraints, rather than any reflection on your qualifications or contributions.</p>
      
      <p>If you have any questions about this decision or would like information about other ways to engage with the College of Connected Computing, please contact the Faculty Affairs office at <a href="mailto:cccfacultyaffairs@vanderbilt.edu">cccfacultyaffairs@vanderbilt.edu</a>.</p>
      
      <p>We appreciate your interest in the College of Connected Computing and hope for opportunities to collaborate in the future.</p>
      
      <p>Best regards,<br/>
      <strong>CCC Faculty Affairs</strong><br/>
      College of Connected Computing<br/>
      Vanderbilt University</p>
    `;

    const payload = {
      data: {
        subject: subject,
        body: body,
        to_recipients: [applicantEmail.trim()],
        cc_recipients: [],
        bcc_recipients: [],
        importance: 'normal'
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    try {
      console.log(`Sending rejection notification email to applicant: ${applicantEmail}`);
      
      const response = await axios.post(this.apiUrl, payload, { 
        headers,
        timeout: 30000
      });

      if (response.status === 200) {
        console.log('✅ Rejection notification email sent successfully to applicant');
        return {
          success: true,
          recipient: applicantEmail,
          messageId: response.data?.data?.id || 'unknown'
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to send rejection notification email to applicant:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // Don't throw the error - we don't want email failures to block status updates
      return {
        success: false,
        error: error.message,
        recipient: applicantEmail
      };
    }
  }

  // Helper method to extract all approver emails from an application
  getApproverEmails(applicationData) {
    const emails = [];
    
    // Add department chair email if present
    if (applicationData.departmentChairEmail) {
      emails.push(applicationData.departmentChairEmail);
    }
    
    // Add division chair email if present
    if (applicationData.divisionChairEmail) {
      emails.push(applicationData.divisionChairEmail);
    }
    
    // Add dean email (always required)
    if (applicationData.deanEmail) {
      emails.push(applicationData.deanEmail);
    }
    
    // Add senior associate dean email if present
    if (applicationData.seniorAssociateDeanEmail) {
      emails.push(applicationData.seniorAssociateDeanEmail);
    }
    
    // Remove duplicates and return
    return [...new Set(emails)];
  }
}

module.exports = EmailService;