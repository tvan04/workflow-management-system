#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testRealSubmission() {
  console.log('Testing Real Application Submission...\n');
  
  try {
    // Create a test CV file
    const testCV = 'Test CV content for John Doe\n\nEducation:\n- PhD Computer Science, University XYZ\n\nExperience:\n- Associate Professor since 2020';
    const cvFilePath = './test-cv.txt';
    fs.writeFileSync(cvFilePath, testCV);
    
    // Get count before submission
    console.log('1. Getting application count before submission...');
    const beforeResponse = await axios.get('http://localhost:3001/api/applications');
    const beforeCount = beforeResponse.data.data.length;
    console.log(`   Applications before: ${beforeCount}`);
    
    // Create FormData for submission
    console.log('\n2. Creating form data...');
    const formData = new FormData();
    formData.append('name', 'Dr. John Doe');
    formData.append('email', 'john.doe@vanderbilt.edu');
    formData.append('title', 'Associate Professor');
    formData.append('department', 'Mathematics');
    formData.append('college', 'College of Arts & Science');
    formData.append('appointmentType', 'secondary');
    formData.append('effectiveDate', '2025-02-01');
    formData.append('duration', '2year');
    formData.append('rationale', 'I am seeking a secondary appointment in CCC to collaborate on mathematical modeling for connected computing systems.');
    formData.append('deanName', 'Dr. Arts Science Dean');
    formData.append('deanEmail', 'arts.dean@vanderbilt.edu');
    formData.append('collegeHasDepartments', 'true');
    formData.append('departmentChairName', 'Dr. Math Chair');
    formData.append('departmentChairEmail', 'math.chair@vanderbilt.edu');
    
    // Append the CV file
    formData.append('cvFile', fs.createReadStream(cvFilePath));
    
    console.log('   ✅ Form data created');
    
    // Submit the application
    console.log('\n3. Submitting application...');
    
    const response = await axios.post('http://localhost:3001/api/applications', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('✅ Application submitted successfully!');
    console.log(`   Application ID: ${response.data.data.applicationId}`);
    console.log(`   Response: ${response.data.message}`);
    
    // Check count after submission
    console.log('\n4. Verifying application was saved...');
    const afterResponse = await axios.get('http://localhost:3001/api/applications');
    const afterCount = afterResponse.data.data.length;
    console.log(`   Applications after: ${afterCount}`);
    
    if (afterCount > beforeCount) {
      console.log('✅ Application count increased - submission successful!');
    } else {
      console.log('❌ Application count did not increase - submission may have failed');
    }
    
    // Find the new application
    console.log('\n5. Finding the submitted application...');
    const newApplication = afterResponse.data.data.find(app => 
      app.facultyMember.email === 'john.doe@vanderbilt.edu'
    );
    
    if (newApplication) {
      console.log('✅ Application found in database!');
      console.log(`   ID: ${newApplication.id}`);
      console.log(`   Faculty: ${newApplication.facultyMember.name}`);
      console.log(`   Status: ${newApplication.status}`);
      console.log(`   College: ${newApplication.facultyMember.college}`);
    } else {
      console.log('❌ Application not found in database');
    }
    
    // Test lookup by email
    console.log('\n6. Testing email lookup...');
    const searchResponse = await axios.get('http://localhost:3001/api/applications/search?q=john.doe@vanderbilt.edu');
    
    if (searchResponse.data.data && searchResponse.data.data.length > 0) {
      console.log('✅ Application found via email lookup!');
      const foundApp = searchResponse.data.data[0];
      console.log(`   Found: ${foundApp.facultyMember.name} (${foundApp.id})`);
    } else {
      console.log('❌ Application not found via email lookup');
    }
    
    // Clean up test file
    fs.unlinkSync(cvFilePath);
    
    console.log('\n✅ All tests completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Clean up test file if it exists
    try {
      fs.unlinkSync('./test-cv.txt');
    } catch (e) {
      // File might not exist
    }
    
    return false;
  }
}

// Run the test
testRealSubmission().then(success => {
  console.log(success ? '\n🎉 Test suite passed!' : '\n💥 Test suite failed!');
  process.exit(success ? 0 : 1);
});