#!/usr/bin/env node

const axios = require('axios');

async function testStatusHistoryFix() {
  console.log('Testing StatusHistory Fix...\n');
  
  try {
    // Test the search API endpoint that was causing the error
    console.log('1. Testing API search for sarah.johnson@vanderbilt.edu...');
    const searchResponse = await axios.get('http://localhost:3001/api/applications/search?q=sarah.johnson@vanderbilt.edu');
    
    if (searchResponse.data.data && searchResponse.data.data.length > 0) {
      const application = searchResponse.data.data[0];
      
      console.log('✅ Application found');
      console.log(`   ID: ${application.id}`);
      console.log(`   Faculty: ${application.facultyMember.name}`);
      console.log(`   Status: ${application.status}`);
      
      // Check if statusHistory exists and is an array
      if (application.statusHistory) {
        console.log('✅ StatusHistory exists');
        console.log(`   StatusHistory entries: ${application.statusHistory.length}`);
        
        if (Array.isArray(application.statusHistory)) {
          console.log('✅ StatusHistory is an array');
          
          // Display status history entries
          application.statusHistory.forEach((entry, index) => {
            console.log(`   ${index + 1}. ${entry.status} (${entry.timestamp}) - ${entry.approver || 'System'}`);
          });
        } else {
          console.log('❌ StatusHistory is not an array');
          return false;
        }
      } else {
        console.log('❌ StatusHistory is missing');
        return false;
      }
      
      console.log('\n2. Testing getStepStatus function logic...');
      
      // Simulate the getStepStatus function logic that was failing
      const statusHistory = application.statusHistory;
      const testStepKey = 'submitted';
      
      console.log(`   Testing statusHistory.find() for step: ${testStepKey}`);
      const historyItem = statusHistory?.find(item => item.status === testStepKey);
      
      if (historyItem) {
        console.log('✅ Found status history item for submitted step');
        console.log(`   Found: ${historyItem.status} at ${historyItem.timestamp}`);
      } else {
        console.log('⚠️  No history item found for submitted step (this might be normal)');
      }
      
      console.log('\n✅ All tests passed! The StatusHistory fix is working correctly.');
      return true;
      
    } else {
      console.log('❌ No application found for sarah.johnson@vanderbilt.edu');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    return false;
  }
}

// Run the test
testStatusHistoryFix().then(success => {
  process.exit(success ? 0 : 1);
});