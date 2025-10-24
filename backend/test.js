const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001/api';

class BackendTester {
  async testHealthCheck() {
    try {
      console.log('🔍 Testing health check...');
      const response = await axios.get('http://localhost:3001/health');
      console.log('✅ Health check passed:', response.data);
      return true;
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return false;
    }
  }

  async testColleges() {
    try {
      console.log('\n🏫 Testing colleges API...');
      
      // Get all colleges
      const response = await axios.get(`${API_BASE}/colleges`);
      console.log(`✅ Retrieved ${response.data.data.length} colleges`);
      
      // Test creating a new college
      const newCollege = {
        name: 'Test College',
        hasDepartments: false,
        deanName: 'Dr. Test Dean',
        deanEmail: 'test.dean@vanderbilt.edu'
      };
      
      const createResponse = await axios.post(`${API_BASE}/colleges`, newCollege);
      console.log('✅ Created new college:', createResponse.data.data.name);
      
      // Clean up - delete the test college
      await axios.delete(`${API_BASE}/colleges/${createResponse.data.data.id}`);
      console.log('✅ Cleaned up test college');
      
      return true;
    } catch (error) {
      console.log('❌ Colleges API test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testApplications() {
    try {
      console.log('\n📋 Testing applications API...');
      
      // Get all applications
      const response = await axios.get(`${API_BASE}/applications`);
      console.log(`✅ Retrieved ${response.data.data.length} applications`);
      
      // Test search
      const searchResponse = await axios.get(`${API_BASE}/applications/search?q=Sarah`);
      console.log(`✅ Search found ${searchResponse.data.data.length} applications`);
      
      // Test application submission (without file for simplicity)
      const formData = new FormData();
      formData.append('name', 'Dr. Test Faculty');
      formData.append('email', 'test.faculty@vanderbilt.edu');
      formData.append('title', 'Associate Professor');
      formData.append('college', 'School of Engineering');
      formData.append('department', 'Computer Science');
      formData.append('appointmentType', 'secondary');
      formData.append('effectiveDate', '2024-12-01');
      formData.append('duration', '1year');
      formData.append('rationale', 'Test rationale for secondary appointment');
      formData.append('deanName', 'Dr. Patricia Williams');
      formData.append('deanEmail', 'patricia.williams@vanderbilt.edu');
      formData.append('collegeHasDepartments', 'true');
      formData.append('departmentChairName', 'Dr. Robert Chen');
      formData.append('departmentChairEmail', 'robert.chen@vanderbilt.edu');
      
      // Create a dummy CV file
      const dummyCvPath = path.join(__dirname, 'test-cv.pdf');
      fs.writeFileSync(dummyCvPath, 'Dummy CV content for testing');
      formData.append('cvFile', fs.createReadStream(dummyCvPath));
      
      const submitResponse = await axios.post(`${API_BASE}/applications`, formData, {
        headers: formData.getHeaders()
      });
      
      console.log('✅ Application submitted:', submitResponse.data.data.applicationId);
      
      // Clean up test file
      fs.unlinkSync(dummyCvPath);
      
      return true;
    } catch (error) {
      console.log('❌ Applications API test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testMetrics() {
    try {
      console.log('\n📊 Testing metrics API...');
      
      const response = await axios.get(`${API_BASE}/metrics`);
      console.log('✅ Retrieved metrics:', {
        totalApplications: response.data.data.totalApplications,
        averageProcessingTime: response.data.data.averageProcessingTime
      });
      
      return true;
    } catch (error) {
      console.log('❌ Metrics API test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testNotifications() {
    try {
      console.log('\n📧 Testing notifications API...');
      
      // Get notification templates
      const templatesResponse = await axios.get(`${API_BASE}/notifications/templates`);
      console.log(`✅ Retrieved ${templatesResponse.data.data.length} notification templates`);
      
      // Test sending a custom notification
      const notification = {
        type: 'custom',
        recipients: ['test@vanderbilt.edu'],
        subject: 'Test Notification',
        message: 'This is a test notification from the API test suite.'
      };
      
      const sendResponse = await axios.post(`${API_BASE}/notifications/send`, notification);
      console.log('✅ Notification sent successfully');
      
      return true;
    } catch (error) {
      console.log('❌ Notifications API test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testSettings() {
    try {
      console.log('\n⚙️  Testing settings API...');
      
      const response = await axios.get(`${API_BASE}/settings`);
      const settingsCount = Object.keys(response.data.data).length;
      console.log(`✅ Retrieved ${settingsCount} system settings`);
      
      return true;
    } catch (error) {
      console.log('❌ Settings API test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting backend API tests...\n');
    
    const tests = [
      { name: 'Health Check', test: () => this.testHealthCheck() },
      { name: 'Colleges API', test: () => this.testColleges() },
      { name: 'Applications API', test: () => this.testApplications() },
      { name: 'Metrics API', test: () => this.testMetrics() },
      { name: 'Notifications API', test: () => this.testNotifications() },
      { name: 'Settings API', test: () => this.testSettings() }
    ];

    const results = [];
    
    for (const { name, test } of tests) {
      try {
        const result = await test();
        results.push({ name, passed: result });
      } catch (error) {
        console.log(`❌ ${name} threw an error:`, error.message);
        results.push({ name, passed: false });
      }
    }

    // Summary
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(({ name, passed }) => {
      console.log(`${passed ? '✅' : '❌'} ${name}`);
    });
    
    console.log(`\nOverall: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Backend is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the logs above for details.');
    }
    
    return passed === total;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new BackendTester();
  
  console.log('Make sure the backend server is running on http://localhost:3001');
  console.log('Run "npm start" in the backend directory first.\n');
  
  setTimeout(async () => {
    await tester.runAllTests();
    process.exit(0);
  }, 1000);
}

module.exports = BackendTester;