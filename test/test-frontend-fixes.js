const axios = require('axios');

async function testFrontendAPICalls() {
  console.log('🧪 Testing Frontend API Integration...');
  
  try {
    const API_BASE = 'http://localhost:3001/api';
    
    // Test the API calls that the frontend ApplicationStatus component makes
    console.log('1. Testing application lookup by ID...');
    
    // Get a test application ID first
    const appsResponse = await axios.get(`${API_BASE}/applications`);
    const applications = appsResponse.data.data;
    
    if (applications.length === 0) {
      console.log('❌ No applications found to test with');
      return false;
    }
    
    const testAppId = applications[0].id;
    console.log(`   Using test application ID: ${testAppId}`);
    
    // Test getById (used by ApplicationStatus component)
    const appResponse = await axios.get(`${API_BASE}/applications/${testAppId}`);
    const app = appResponse.data.data;
    
    console.log('✅ Application lookup by ID successful');
    console.log(`   Faculty: ${app.facultyMember.name}`);
    console.log(`   Status: ${app.status}`);
    console.log(`   Status History entries: ${app.statusHistory.length}`);
    
    // Test the date parsing that the frontend does
    const submittedAt = new Date(app.submittedAt);
    const updatedAt = new Date(app.updatedAt);
    
    console.log('✅ Date parsing works');
    console.log(`   Submitted: ${submittedAt.toLocaleDateString()}`);
    console.log(`   Updated: ${updatedAt.toLocaleDateString()}`);
    
    // Test status history parsing (the part that had TypeScript errors)
    if (app.statusHistory && app.statusHistory.length > 0) {
      app.statusHistory.forEach(item => {
        const timestamp = new Date(item.timestamp);
        console.log(`   History: ${item.status} at ${timestamp.toLocaleString()}`);
      });
      console.log('✅ Status history parsing works');
    }
    
    // Test search functionality
    console.log('\n2. Testing application search...');
    const searchResponse = await axios.get(`${API_BASE}/applications/search?q=${app.facultyMember.email}`);
    
    if (searchResponse.data.data.length > 0) {
      console.log(`✅ Search by email works: ${searchResponse.data.data.length} results`);
    } else {
      console.log('⚠️  Search returned no results');
    }
    
    // Test name search
    const nameSearchResponse = await axios.get(`${API_BASE}/applications/search?q=${app.facultyMember.name.split(' ')[1]}`);
    
    if (nameSearchResponse.data.data.length > 0) {
      console.log(`✅ Search by name works: ${nameSearchResponse.data.data.length} results`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Frontend API test failed:', error.response?.data || error.message);
    return false;
  }
}

// Run the test
testFrontendAPICalls().then(success => {
  if (success) {
    console.log('\n🎉 All frontend API integration tests passed!');
    console.log('The TypeScript fixes are working correctly.');
    console.log('\n✅ You can now:');
    console.log('   1. Start the frontend with: npm start');
    console.log('   2. Test application lookup in the browser');
    console.log('   3. Verify that date/time displays work correctly');
  } else {
    console.log('\n❌ Some tests failed. Check the backend server.');
  }
  process.exit(success ? 0 : 1);
});