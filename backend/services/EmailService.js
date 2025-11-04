const axios = require('axios');
require('dotenv').config();

class EmailService {
  constructor() {
    this.apiKey = process.env.REACT_APP_AMPLIFY_API_KEY;
    this.apiUrl = 'https://prod-api.vanderbilt.ai/microsoft/integrations/send_mail';
    this.cccFacultyEmail = 'tristan.v.van@vanderbilt.edu'; // Configurable CCC faculty email
    
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

    // Filter out any null/undefined emails and restrict to test email only
    const validEmails = approverEmails.filter(email => email && email.trim());
    
    // FOR TESTING: Only send to tristan.v.van@vanderbilt.edu
    const testEmails = validEmails.filter(email => email.trim() === 'tristan.v.van@vanderbilt.edu');
    
    if (testEmails.length === 0) {
      console.log('⚠️ FOR TESTING: Emails restricted to tristan.v.van@vanderbilt.edu only. Skipping notification.');
      console.log(`Original recipients would have been: ${validEmails.join(', ')}`);
      return;
    }

    // Send individual emails with personalized approval links
    const results = [];
    
    for (const approverEmail of testEmails) {
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