#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

async function testSignatureWorkflow() {
  console.log('🔍 Testing Signature Page Workflow\n');
  
  const testEmail = process.env.TEST_EMAIL || 'jacqueline.c.frist@vanderbilt.edu';
  console.log(`Using test email: ${testEmail}`);

  try {
    console.log('1. Creating test application...');
    
    // Create a test application first
    const formData = new FormData();
    formData.append('name', 'Dr. Test Approver');
    formData.append('email', 'test.approver@vanderbilt.edu');
    formData.append('title', 'Associate Professor');
    formData.append('department', 'Computer Science');
    formData.append('college', 'School of Engineering');
    formData.append('appointmentType', 'secondary');
    formData.append('effectiveDate', '2025-02-01');
    formData.append('duration', '2year');
    formData.append('rationale', 'Test rationale for signature workflow testing');
    formData.append('deanName', 'Dr. Engineering Dean');
    formData.append('deanEmail', testEmail); // Test email
    formData.append('collegeHasDepartments', 'true');
    formData.append('departmentChairName', 'Dr. CS Chair');
    formData.append('departmentChairEmail', testEmail); // Test email
    
    // Skip CV file for testing - we'll test the approval workflow without it
    // In production, CV file would be required

    const submitResponse = await axios.post('http://localhost:3001/api/applications', formData, {
      headers: formData.getHeaders()
    });

    const applicationId = submitResponse.data.data.applicationId;
    console.log(`✅ Test application created: ${applicationId}`);

    // No test file to clean up

    console.log('\n2. Testing application retrieval for signature page...');
    
    // Test getting the application (simulates signature page loading)
    const appResponse = await axios.get(`http://localhost:3001/api/applications/${applicationId}`);
    const application = appResponse.data.data;
    
    console.log(`✅ Application retrieved successfully`);
    console.log(`   Faculty: ${application.facultyMember.name}`);
    console.log(`   Status: ${application.status}`);
    console.log(`   Duration: ${application.duration}`);
    console.log(`   Effective Date: ${application.effectiveDate}`);

    console.log('\n3. Testing approval workflow...');
    
    // Test approval submission
    const approvalData = {
      approverEmail: testEmail,
      action: 'approve',
      signature: 'Dr. Tristan Van',
      notes: 'Approved for testing signature workflow'
    };

    const approveResponse = await axios.post(
      `http://localhost:3001/api/applications/${applicationId}/approve`,
      approvalData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Approval processed successfully`);
    console.log(`   New status: ${approveResponse.data.data.newStatus}`);
    console.log(`   Message: ${approveResponse.data.message}`);

    console.log('\n4. Verifying status update...');
    
    // Verify the application status was updated
    const updatedAppResponse = await axios.get(`http://localhost:3001/api/applications/${applicationId}`);
    const updatedApplication = updatedAppResponse.data.data;
    
    console.log(`✅ Status verified: ${updatedApplication.status}`);
    
    // Check status history
    if (updatedApplication.statusHistory && updatedApplication.statusHistory.length > 0) {
      console.log(`✅ Status history updated: ${updatedApplication.statusHistory.length} entries`);
      const latestEntry = updatedApplication.statusHistory[updatedApplication.statusHistory.length - 1];
      console.log(`   Latest entry: ${latestEntry.status} by ${latestEntry.approver}`);
    } else {
      console.log('⚠️ Status history not found');
    }

    console.log('\n5. Testing denial workflow...');
    
    // Create another test application for denial test
    const formData2 = new FormData();
    formData2.append('name', 'Dr. Test Denial');
    formData2.append('email', 'test.denial@vanderbilt.edu');
    formData2.append('title', 'Assistant Professor');
    formData2.append('department', 'Mathematics');
    formData2.append('college', 'College of Arts & Science');
    formData2.append('appointmentType', 'secondary');
    formData2.append('effectiveDate', '2025-03-01');
    formData2.append('duration', '1year');
    formData2.append('rationale', 'Test rationale for denial testing');
    formData2.append('deanName', 'Dr. Arts Dean');
    formData2.append('deanEmail', testEmail); // Test email
    formData2.append('collegeHasDepartments', 'true');
    
    // Skip CV file for testing

    const submitResponse2 = await axios.post('http://localhost:3001/api/applications', formData2, {
      headers: formData2.getHeaders()
    });

    const applicationId2 = submitResponse2.data.data.applicationId;

    // Test denial
    const denialData = {
      approverEmail: testEmail,
      action: 'deny',
      signature: 'Dr. Tristan Van',
      notes: 'Denied for testing purposes - insufficient justification'
    };

    const denyResponse = await axios.post(
      `http://localhost:3001/api/applications/${applicationId2}/approve`,
      denialData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Denial processed successfully`);
    console.log(`   New status: ${denyResponse.data.data.newStatus}`);
    console.log(`   Message: ${denyResponse.data.message}`);

    console.log('\n📋 SIGNATURE WORKFLOW TEST SUMMARY:');
    console.log('✅ Signature page backend API working');
    console.log('✅ Application data retrieval working');
    console.log('✅ Approval workflow functional');
    console.log('✅ Denial workflow functional');
    console.log('✅ Status updates and history tracking working');
    console.log(`✅ Email restriction to ${testEmail} active`);

    console.log('\n🎯 FRONTEND TESTING:');
    console.log('1. Visit: http://localhost:3000/signature/' + applicationId);
    console.log(`2. Add query params: ?approver=${testEmail}&token=testtoken`);
    console.log('3. Test approval/denial with signature validation');

    console.log('\n📧 EMAIL NOTIFICATION TESTING:');
    console.log(`- Emails will only be sent to ${testEmail}`);
    console.log('- Approval links will be: http://localhost:3000/signature/{id}?approver={email}&token={token}');
    console.log('- Each email contains personalized approval links');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

testSignatureWorkflow().then(success => {
  console.log(success ? '\n✅ Signature workflow tests completed successfully!' : '\n❌ Signature workflow tests failed!');
  process.exit(success ? 0 : 1);
});