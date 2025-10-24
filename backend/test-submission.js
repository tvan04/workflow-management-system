#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testApplicationSubmission() {
  console.log('Testing Application Lookup Functionality...\n');
  
  try {
    // First, get all applications to see what we have
    console.log('1. Getting all applications...');
    const listResponse = await axios.get('http://localhost:3001/api/applications');
    const applications = listResponse.data.data;
    
    console.log(`✅ Found ${applications.length} applications in database`);
    
    // Test each application's email lookup
    console.log('\n2. Testing email lookup for each application...');
    let successCount = 0;
    let failCount = 0;
    
    for (const app of applications) {
      const email = app.facultyMember.email;
      const name = app.facultyMember.name;
      
      try {
        const searchResponse = await axios.get(`http://localhost:3001/api/applications/search?q=${encodeURIComponent(email)}`);
        
        if (searchResponse.data.data && searchResponse.data.data.length > 0) {
          console.log(`   ✅ ${name} (${email}) - FOUND`);
          successCount++;
        } else {
          console.log(`   ❌ ${name} (${email}) - NOT FOUND`);
          failCount++;
        }
      } catch (error) {
        console.log(`   ❌ ${name} (${email}) - ERROR: ${error.message}`);
        failCount++;
      }
    }
    
    console.log(`\nLookup Results: ${successCount} successful, ${failCount} failed`);
    
    // Test specific problematic emails mentioned by user
    console.log('\n3. Testing specific emails mentioned by user...');
    const testEmails = [
      'sarah.johnson@vanderbilt.edu',
      'michael.brown@vumc.org',
      'emily.davis@vanderbilt.edu',
      'test.faculty@vanderbilt.edu'
    ];
    
    for (const email of testEmails) {
      try {
        const searchResponse = await axios.get(`http://localhost:3001/api/applications/search?q=${encodeURIComponent(email)}`);
        
        if (searchResponse.data.data && searchResponse.data.data.length > 0) {
          const app = searchResponse.data.data[0];
          console.log(`   ✅ ${email} - FOUND: ${app.facultyMember.name} (${app.id})`);
          console.log(`      Status: ${app.status}, StatusHistory: ${app.statusHistory ? app.statusHistory.length : 0} entries`);
        } else {
          console.log(`   ❌ ${email} - NOT FOUND`);
        }
      } catch (error) {
        console.log(`   ❌ ${email} - ERROR: ${error.message}`);
      }
    }
    
    console.log('\n✅ Lookup functionality test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
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
testApplicationSubmission().then(success => {
  process.exit(success ? 0 : 1);
});