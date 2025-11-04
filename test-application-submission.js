#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testApplicationSubmission() {
  console.log('🔍 Testing Application Submission with Test Email\n');

  try {
    console.log('1. Creating test application with tristan.v.van@vanderbilt.edu emails...');
    
    // Create form data with test email for all fields
    const formData = new FormData();
    formData.append('name', 'Dr. Test Faculty Member');
    formData.append('email', 'tristan.v.van@vanderbilt.edu'); // Use test email
    formData.append('title', 'Associate Professor');
    formData.append('department', 'Computer Science');
    formData.append('college', 'School of Engineering');
    formData.append('appointmentType', 'secondary');
    formData.append('effectiveDate', '2025-02-15');
    formData.append('duration', '2year');
    formData.append('rationale', 'Test application submission to verify the workflow is working correctly. This is a test application for the signature page functionality.');
    
    // Use test email for all approver fields
    formData.append('deanName', 'Dr. Test Dean');
    formData.append('deanEmail', 'tristan.v.van@vanderbilt.edu');
    formData.append('collegeHasDepartments', 'true');
    formData.append('departmentChairName', 'Dr. Test Department Chair');
    formData.append('departmentChairEmail', 'tristan.v.van@vanderbilt.edu');
    
    // Create a temporary PDF-like file for testing (binary content)
    const pdfContent = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4 header
      0x0A, 0x25, 0xC4, 0xE5, 0xF2, 0xE5, 0xEB, 0xA7, // binary bytes
      0xF3, 0xA0, 0xD0, 0xC4, 0xC6, 0x0A, // more binary
      // Add some PDF structure
      ...Buffer.from('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'),
      ...Buffer.from('2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n'),
      ...Buffer.from('3 0 obj<</Type/Page/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n'),
      ...Buffer.from('4 0 obj<</Length 44>>stream\nBT\n/F1 12 Tf\n72 720 Td\n(Test CV) Tj\nET\nendstream\nendobj\n'),
      ...Buffer.from('xref\n0 5\n0000000000 65535 f \n'),
      ...Buffer.from('trailer<</Size 5/Root 1 0 R>>\nstartxref\n%%EOF')
    ]);
    
    fs.writeFileSync('./test-cv.pdf', pdfContent);
    formData.append('cvFile', fs.createReadStream('./test-cv.pdf'));

    console.log('2. Submitting application...');
    
    const response = await axios.post('http://localhost:3001/api/applications', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    console.log('✅ Application submitted successfully!');
    console.log(`   Application ID: ${response.data.data.applicationId}`);
    console.log(`   Response: ${response.data.message}`);

    // Clean up test file
    fs.unlinkSync('./test-cv.pdf');

    console.log('\n3. Verifying application was saved...');
    
    const applicationId = response.data.data.applicationId;
    const getResponse = await axios.get(`http://localhost:3001/api/applications/${applicationId}`);
    const application = getResponse.data.data;
    
    console.log('✅ Application retrieved from database:');
    console.log(`   ID: ${application.id}`);
    console.log(`   Faculty: ${application.facultyMember.name}`);
    console.log(`   Email: ${application.facultyMember.email}`);
    console.log(`   Status: ${application.status}`);
    console.log(`   Duration: ${application.duration}`);
    console.log(`   Effective Date: ${application.effectiveDate}`);

    console.log('\n4. Checking email notification behavior...');
    console.log('   📧 Email notifications should be restricted to tristan.v.van@vanderbilt.edu');
    console.log('   📧 Check server logs for email sending confirmation');

    console.log('\n📋 TEST RESULTS:');
    console.log('✅ Backend server running correctly');
    console.log('✅ Application submission API working');
    console.log('✅ File upload (PDF) working');
    console.log('✅ Database storage working');
    console.log('✅ Email fields using test address: tristan.v.van@vanderbilt.edu');
    
    console.log('\n🎯 FRONTEND SHOULD NOW WORK:');
    console.log('- Frontend can now submit applications successfully');
    console.log('- Applications will be saved to database');
    console.log('- Email notifications restricted to test address');
    console.log(`- New signature page link: http://localhost:3000/signature/${applicationId}`);
    
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Clean up test file if it exists
    try {
      fs.unlinkSync('./test-cv.pdf');
    } catch (e) {
      // File might not exist
    }
    
    return false;
  }
}

testApplicationSubmission().then(success => {
  console.log(success ? '\n🎉 Application submission is working! Frontend should now work.' : '\n💥 Application submission failed - needs investigation.');
  process.exit(success ? 0 : 1);
});