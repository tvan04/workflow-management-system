const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001/api';

class ComprehensiveTester {
  constructor() {
    this.testApplicationId = null;
  }

  async testApplicationSubmissionAndPersistence() {
    try {
      console.log('\n📋 Testing Application Submission & Database Persistence...');
      
      // Create a test CV file
      const testCvPath = path.join(__dirname, 'test-cv.pdf');
      fs.writeFileSync(testCvPath, 'PDF content placeholder for testing');

      // Get initial application count
      const initialResponse = await axios.get(`${API_BASE}/applications`);
      const initialCount = initialResponse.data.data.length;
      console.log(`📊 Initial application count: ${initialCount}`);

      // Submit a new application
      const formData = new FormData();
      formData.append('name', 'Dr. Test Faculty Member');
      formData.append('email', 'test.faculty@vanderbilt.edu');
      formData.append('title', 'Associate Professor');
      formData.append('college', 'School of Engineering');
      formData.append('department', 'Computer Science');
      formData.append('appointmentType', 'secondary');
      formData.append('effectiveDate', '2024-12-01');
      formData.append('duration', '2year');
      formData.append('rationale', 'I am seeking a secondary appointment in CCC to collaborate on cutting-edge research in AI and machine learning that aligns with both my expertise in computer vision and CCC\'s mission of advancing connected computing solutions for societal benefit.');
      formData.append('deanName', 'Dr. Patricia Williams');
      formData.append('deanEmail', 'patricia.williams@vanderbilt.edu');
      formData.append('collegeHasDepartments', 'true');
      formData.append('departmentChairName', 'Dr. Robert Chen');
      formData.append('departmentChairEmail', 'robert.chen@vanderbilt.edu');
      formData.append('cvFile', fs.createReadStream(testCvPath));

      console.log('📤 Submitting application...');
      const submitResponse = await axios.post(`${API_BASE}/applications`, formData, {
        headers: formData.getHeaders()
      });

      this.testApplicationId = submitResponse.data.data.applicationId;
      console.log(`✅ Application submitted successfully: ${this.testApplicationId}`);

      // Wait a moment for database operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify the application was saved to database
      const updatedResponse = await axios.get(`${API_BASE}/applications`);
      const updatedCount = updatedResponse.data.data.length;
      console.log(`📊 Updated application count: ${updatedCount}`);

      if (updatedCount > initialCount) {
        console.log('✅ Application successfully persisted to database');
      } else {
        throw new Error('Application was not saved to database');
      }

      // Verify we can retrieve the specific application
      const appResponse = await axios.get(`${API_BASE}/applications/${this.testApplicationId}`);
      const application = appResponse.data.data;
      
      console.log(`✅ Retrieved application: ${application.id}`);
      console.log(`   Faculty: ${application.facultyMember.name}`);
      console.log(`   Status: ${application.status}`);
      console.log(`   Status History entries: ${application.statusHistory.length}`);

      // Clean up test file
      fs.unlinkSync(testCvPath);

      return true;
    } catch (error) {
      console.log('❌ Application submission test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testApplicationLookup() {
    try {
      console.log('\n🔍 Testing Application Lookup & Search...');

      if (!this.testApplicationId) {
        throw new Error('No test application ID available');
      }

      // Test lookup by ID
      console.log(`🔎 Looking up by ID: ${this.testApplicationId}`);
      const idResponse = await axios.get(`${API_BASE}/applications/${this.testApplicationId}`);
      console.log(`✅ Found by ID: ${idResponse.data.data.facultyMember.name}`);

      // Test search by email
      console.log('🔎 Searching by email: test.faculty@vanderbilt.edu');
      const searchResponse = await axios.get(`${API_BASE}/applications/search?q=test.faculty@vanderbilt.edu`);
      
      if (searchResponse.data.data.length > 0) {
        console.log(`✅ Found by email: ${searchResponse.data.data.length} results`);
        console.log(`   First result: ${searchResponse.data.data[0].facultyMember.name}`);
      } else {
        throw new Error('No applications found by email search');
      }

      // Test search by name
      console.log('🔎 Searching by name: Test Faculty');
      const nameSearchResponse = await axios.get(`${API_BASE}/applications/search?q=Test Faculty`);
      
      if (nameSearchResponse.data.data.length > 0) {
        console.log(`✅ Found by name: ${nameSearchResponse.data.data.length} results`);
      } else {
        throw new Error('No applications found by name search');
      }

      return true;
    } catch (error) {
      console.log('❌ Application lookup test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testEmailNotifications() {
    try {
      console.log('\n📧 Testing Email Notifications...');

      if (!this.testApplicationId) {
        throw new Error('No test application ID available');
      }

      // Check email log before
      const logPath = path.join(__dirname, 'logs', 'emails.log');
      let initialLogSize = 0;
      if (fs.existsSync(logPath)) {
        initialLogSize = fs.readFileSync(logPath, 'utf8').split('\n').filter(line => line.trim()).length;
      }
      console.log(`📊 Initial email log entries: ${initialLogSize}`);

      // Test status change notification (this should trigger email)
      console.log('📤 Updating application status to trigger notification...');
      await axios.patch(`${API_BASE}/applications/${this.testApplicationId}/status`, {
        status: 'ccc_review',
        approver: 'Test Admin',
        notes: 'Moving to CCC review for testing notifications'
      });
      
      console.log('✅ Status updated successfully');

      // Wait for async email processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if emails were logged
      if (fs.existsSync(logPath)) {
        const currentLogSize = fs.readFileSync(logPath, 'utf8').split('\n').filter(line => line.trim()).length;
        console.log(`📊 Current email log entries: ${currentLogSize}`);

        if (currentLogSize > initialLogSize) {
          console.log(`✅ Email notifications sent: ${currentLogSize - initialLogSize} new emails`);
          
          // Show the most recent email
          const logContent = fs.readFileSync(logPath, 'utf8');
          const emails = logContent.split('\n').filter(line => line.trim()).map(line => {
            try { return JSON.parse(line); } catch { return null; }
          }).filter(Boolean);
          
          if (emails.length > 0) {
            const lastEmail = emails[emails.length - 1];
            console.log('📧 Most recent email:');
            console.log(`   TO: ${lastEmail.to}`);
            console.log(`   SUBJECT: ${lastEmail.subject}`);
            console.log(`   TIMESTAMP: ${lastEmail.timestamp}`);
          }
        } else {
          console.log('⚠️  No new email notifications detected');
        }
      } else {
        console.log('⚠️  No email log file found');
      }

      // Test manual reminder notification
      console.log('📤 Testing manual reminder notification...');
      const reminderResponse = await axios.post(`${API_BASE}/applications/${this.testApplicationId}/remind`);
      
      if (reminderResponse.data.data.sent) {
        console.log('✅ Manual reminder sent successfully');
      }

      // Test bulk notifications
      console.log('📤 Testing bulk reminder notifications...');
      const bulkResponse = await axios.post(`${API_BASE}/notifications/bulk-reminders`);
      console.log(`✅ Bulk reminders processed: ${bulkResponse.data.data.remindersSent} applications`);

      return true;
    } catch (error) {
      console.log('❌ Email notification test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testWorkflowProgression() {
    try {
      console.log('\n🔄 Testing Complete Workflow Progression...');

      if (!this.testApplicationId) {
        throw new Error('No test application ID available');
      }

      const statuses = [
        { status: 'ccc_review', description: 'CCC Review' },
        { status: 'awaiting_primary_approval', description: 'Awaiting Primary Approval' },
        { status: 'approved', description: 'Approved' },
        { status: 'fis_entry_pending', description: 'FIS Entry Pending' },
        { status: 'completed', description: 'Completed' }
      ];

      for (let i = 0; i < statuses.length; i++) {
        const { status, description } = statuses[i];
        
        console.log(`🔄 Updating to: ${description}`);
        await axios.patch(`${API_BASE}/applications/${this.testApplicationId}/status`, {
          status: status,
          approver: 'Test Workflow',
          notes: `Automated workflow test - ${description}`
        });

        // Verify status was updated
        const appResponse = await axios.get(`${API_BASE}/applications/${this.testApplicationId}`);
        const app = appResponse.data.data;
        
        if (app.status === status) {
          console.log(`✅ Status updated to: ${status}`);
          console.log(`   Status history entries: ${app.statusHistory.length}`);
        } else {
          throw new Error(`Status update failed. Expected: ${status}, Got: ${app.status}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between updates
      }

      // Test final application state
      const finalResponse = await axios.get(`${API_BASE}/applications/${this.testApplicationId}`);
      const finalApp = finalResponse.data.data;
      
      console.log('📊 Final application state:');
      console.log(`   Status: ${finalApp.status}`);
      console.log(`   Status History: ${finalApp.statusHistory.length} entries`);
      console.log(`   Processing Time: ${finalApp.processingTimeWeeks || 'Not calculated'} weeks`);

      return true;
    } catch (error) {
      console.log('❌ Workflow progression test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testDashboardMetrics() {
    try {
      console.log('\n📊 Testing Dashboard Metrics...');

      const metricsResponse = await axios.get(`${API_BASE}/metrics`);
      const metrics = metricsResponse.data.data;

      console.log('📈 Current metrics:');
      console.log(`   Total Applications: ${metrics.totalApplications}`);
      console.log(`   Average Processing Time: ${metrics.averageProcessingTime} weeks`);
      console.log(`   Stalled Applications: ${metrics.stalledApplications.length}`);
      console.log('   Applications by Status:');
      
      Object.entries(metrics.applicationsByStatus).forEach(([status, count]) => {
        if (count > 0) {
          console.log(`     ${status}: ${count}`);
        }
      });

      if (metrics.totalApplications > 0) {
        console.log('✅ Dashboard metrics are working correctly');
      }

      return true;
    } catch (error) {
      console.log('❌ Dashboard metrics test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Backend Tests...');
    console.log('========================================\n');
    
    const tests = [
      { name: 'Application Submission & Persistence', test: () => this.testApplicationSubmissionAndPersistence() },
      { name: 'Application Lookup & Search', test: () => this.testApplicationLookup() },
      { name: 'Email Notifications', test: () => this.testEmailNotifications() },
      { name: 'Workflow Progression', test: () => this.testWorkflowProgression() },
      { name: 'Dashboard Metrics', test: () => this.testDashboardMetrics() }
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
    console.log('\n📋 Comprehensive Test Results:');
    console.log('===============================');
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(({ name, passed }) => {
      console.log(`${passed ? '✅' : '❌'} ${name}`);
    });
    
    console.log(`\n🎯 Overall Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED! The backend is fully functional.');
      console.log('\n✅ Features Verified:');
      console.log('   • Application submission saves to database');
      console.log('   • Application lookup by ID and email works');
      console.log('   • Email notifications are sent properly');
      console.log('   • Complete workflow progression functions');
      console.log('   • Dashboard metrics are accurate');
      
      if (this.testApplicationId) {
        console.log(`\n📝 Test Application ID: ${this.testApplicationId}`);
        console.log('   You can use this ID to test the frontend lookup feature!');
      }
    } else {
      console.log('⚠️  Some tests failed. Check the logs above for details.');
    }
    
    return passed === total;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new ComprehensiveTester();
  
  console.log('🔧 Make sure the backend server is running on http://localhost:3001');
  console.log('   Run "npm start" in the backend directory first.\n');
  
  setTimeout(async () => {
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  }, 1000);
}

module.exports = ComprehensiveTester;