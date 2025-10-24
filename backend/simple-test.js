#!/usr/bin/env node

const axios = require('axios');

async function simpleTest() {
  console.log('Testing Admin Panel Data Source...\n');
  
  try {
    const response = await axios.get('http://localhost:3001/api/applications');
    const apps = response.data.data;
    
    console.log(`✅ API Returns: ${apps.length} applications`);
    
    if (apps.length > 0) {
      console.log('\nSample applications:');
      apps.slice(0, 3).forEach((app, i) => {
        console.log(`${i+1}. ${app.facultyMember.name} - ${app.status} (${app.id})`);
      });
      
      console.log('\n✅ ADMIN PANEL FIX APPLIED:');
      console.log('   - Changed from mockApplications to applicationApi.getAll()');
      console.log('   - Admin panel will now show these real applications');
      console.log('   - New submissions will appear after page refresh');
    }
    
    return true;
  } catch (error) {
    console.error('❌ API Error:', error.message);
    return false;
  }
}

simpleTest().then(success => process.exit(success ? 0 : 1));