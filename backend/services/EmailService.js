const axios = require('axios');
require('dotenv').config();

class EmailService {
  constructor() {
    this.apiKey = process.env.REACT_APP_AMPLIFY_API_KEY;
    this.apiUrl = 'https://prod-api.vanderbilt.ai/microsoft/integrations/send_mail';
    
    if (!this.apiKey) {
      console.warn('Warning: REACT_APP_AMPLIFY_API_KEY not found in environment variables');
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

    // Filter out any null/undefined emails
    const validEmails = approverEmails.filter(email => email && email.trim());
    
    if (validEmails.length === 0) {
      console.log('No valid approver emails found, skipping email notification');
      return;
    }

    const subject = `Secondary Appointment Application - Approval Required`;
    const body = `
      <p>Dear Recipient,</p>
      
      <p>A faculty member from your school and/or department has submitted an application for a secondary appointment at the College of Connected Computing at Vanderbilt University. Your approval is required to proceed with this request.</p>
      
      <p><strong>Applicant:</strong> ${applicantName}<br/>
      <strong>Primary Appointment:</strong> ${primaryAppointment || 'Not specified'}</p>
      
      <p>Please log into the workflow management system to review and process this application.</p>
      
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
        to_recipients: validEmails,
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
      console.log(`Sending approval notification emails to: ${validEmails.join(', ')}`);
      
      const response = await axios.post(this.apiUrl, payload, { 
        headers,
        timeout: 30000
      });

      if (response.status === 200) {
        console.log('✅ Approval notification emails sent successfully');
        return {
          success: true,
          recipients: validEmails,
          messageId: response.data?.data?.id || 'unknown'
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to send approval notification emails:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // Don't throw the error - we don't want email failures to block application submission
      return {
        success: false,
        error: error.message,
        recipients: validEmails
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