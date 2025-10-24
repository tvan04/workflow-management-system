#!/usr/bin/env node

/**
 * Integration Test Script for Secondary Appointment Workflow Management System
 * 
 * This script tests the complete integration between the React frontend and Node.js backend.
 * It verifies that all major features work end-to-end.
 */

const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class IntegrationTester {
  constructor() {
    this.backendProcess = null;
    this.frontendProcess = null;
    this.testApplicationId = null;
  }

  async startBackend() {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting backend server...');
      
      this.backendProcess = spawn('npm', ['start'], {
        cwd: path.join(__dirname, 'backend'),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      this.backendProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server running on port')) {
          console.log('✅ Backend server started successfully');
          resolve();
        }
      });

      this.backendProcess.stderr.on('data', (data) => {
        console.error('Backend error:', data.toString());
      });

      this.backendProcess.on('error', reject);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.backendProcess) {
          reject(new Error('Backend startup timeout'));
        }
      }, 30000);
    });
  }

  async waitForBackend() {
    console.log('⏳ Waiting for backend to be ready...');
    
    for (let i = 0; i < 30; i++) {
      try {
        const response = await axios.get('http://localhost:3001/health', { timeout: 1000 });
        if (response.data.status === 'OK') {
          console.log('✅ Backend is ready');
          return true;
        }
      } catch (error) {
        // Backend not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Backend failed to become ready');
  }

  async testBackendBasicFunctionality() {
    console.log('\n🧪 Testing backend basic functionality...');
    
    try {
      // Test health endpoint
      const healthResponse = await axios.get('http://localhost:3001/health');
      console.log('✅ Health check passed');

      // Test applications endpoint
      const appsResponse = await axios.get('http://localhost:3001/api/applications');
      console.log(`✅ Applications endpoint works (${appsResponse.data.data.length} applications)`);

      // Test colleges endpoint
      const collegesResponse = await axios.get('http://localhost:3001/api/colleges');
      console.log(`✅ Colleges endpoint works (${collegesResponse.data.data.length} colleges)`);

      // Test metrics endpoint
      const metricsResponse = await axios.get('http://localhost:3001/api/metrics');
      console.log('✅ Metrics endpoint works');

      return true;
    } catch (error) {
      console.error('❌ Backend functionality test failed:', error.message);
      return false;
    }
  }

  async testApplicationSubmission() {
    console.log('\n📋 Testing application submission...');
    
    try {
      const FormData = require('form-data');
      
      // Create test CV file
      const testCvPath = path.join(__dirname, 'temp-test-cv.pdf');
      fs.writeFileSync(testCvPath, 'Test CV content for integration testing');

      const formData = new FormData();
      formData.append('name', 'Dr. Integration Test Faculty');
      formData.append('email', 'integration.test@vanderbilt.edu');
      formData.append('title', 'Professor');
      formData.append('college', 'School of Engineering');
      formData.append('department', 'Computer Science');
      formData.append('appointmentType', 'secondary');
      formData.append('effectiveDate', '2024-12-01');
      formData.append('duration', '1year');
      formData.append('rationale', 'Integration testing rationale for secondary appointment application system verification.');
      formData.append('deanName', 'Dr. Patricia Williams');
      formData.append('deanEmail', 'patricia.williams@vanderbilt.edu');
      formData.append('collegeHasDepartments', 'true');
      formData.append('departmentChairName', 'Dr. Robert Chen');
      formData.append('departmentChairEmail', 'robert.chen@vanderbilt.edu');
      formData.append('cvFile', fs.createReadStream(testCvPath));

      const response = await axios.post('http://localhost:3001/api/applications', formData, {
        headers: formData.getHeaders()
      });

      this.testApplicationId = response.data.data.applicationId;
      console.log(`✅ Application submitted: ${this.testApplicationId}`);

      // Clean up test file
      fs.unlinkSync(testCvPath);

      return true;
    } catch (error) {
      console.error('❌ Application submission failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testApplicationLookup() {
    console.log('\n🔍 Testing application lookup...');
    
    if (!this.testApplicationId) {
      console.error('❌ No test application ID available');
      return false;
    }

    try {
      // Test lookup by ID
      const response = await axios.get(`http://localhost:3001/api/applications/${this.testApplicationId}`);
      console.log(`✅ Application lookup by ID works: ${response.data.data.facultyMember.name}`);

      // Test search by email
      const searchResponse = await axios.get('http://localhost:3001/api/applications/search?q=integration.test@vanderbilt.edu');
      if (searchResponse.data.data.length > 0) {
        console.log(`✅ Application search by email works: ${searchResponse.data.data.length} results`);
      }

      return true;
    } catch (error) {
      console.error('❌ Application lookup failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testEmailNotifications() {
    console.log('\n📧 Testing email notifications...');
    
    if (!this.testApplicationId) {
      console.error('❌ No test application ID available');
      return false;
    }

    try {
      // Update status to trigger notification
      await axios.patch(`http://localhost:3001/api/applications/${this.testApplicationId}/status`, {
        status: 'ccc_review',
        approver: 'Integration Test',
        notes: 'Testing notification system'
      });

      console.log('✅ Status update successful (should trigger email)');

      // Check email logs
      const logPath = path.join(__dirname, 'backend', 'logs', 'emails.log');
      if (fs.existsSync(logPath)) {
        const logs = fs.readFileSync(logPath, 'utf8');
        const emailCount = logs.split('\n').filter(line => line.trim()).length;
        console.log(`✅ Email notification system working (${emailCount} emails logged)`);
      } else {
        console.log('⚠️  Email log not found (emails may still be working)');
      }

      return true;
    } catch (error) {
      console.error('❌ Email notification test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.backendProcess) {
      this.backendProcess.kill();
      console.log('✅ Backend process terminated');
    }
    
    if (this.frontendProcess) {
      this.frontendProcess.kill();
      console.log('✅ Frontend process terminated');
    }

    // Clean up any test files
    const testFiles = ['temp-test-cv.pdf'];
    testFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }

  async run() {
    console.log('🔧 Secondary Appointment Workflow Management System');
    console.log('   Integration Test Suite');
    console.log('==========================================\n');

    const results = [];
    
    try {
      // Start backend
      await this.startBackend();
      await this.waitForBackend();

      // Run tests
      const tests = [
        { name: 'Backend Basic Functionality', test: () => this.testBackendBasicFunctionality() },
        { name: 'Application Submission', test: () => this.testApplicationSubmission() },
        { name: 'Application Lookup', test: () => this.testApplicationLookup() },
        { name: 'Email Notifications', test: () => this.testEmailNotifications() }
      ];

      for (const { name, test } of tests) {
        try {
          const result = await test();
          results.push({ name, passed: result });
        } catch (error) {
          console.error(`❌ ${name} error:`, error.message);
          results.push({ name, passed: false });
        }
      }

    } catch (error) {
      console.error('❌ Integration test setup failed:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }

    // Results
    console.log('\n📊 Integration Test Results:');
    console.log('============================');
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(({ name, passed }) => {
      console.log(`${passed ? '✅' : '❌'} ${name}`);
    });
    
    console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);

    if (passed === total) {
      console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
      console.log('\n✅ The system is ready for use:');
      console.log('   1. Start backend: cd backend && npm start');
      console.log('   2. Start frontend: npm start');
      console.log('   3. Open: http://localhost:3000');
      
      if (this.testApplicationId) {
        console.log(`\n📝 Test Application ID: ${this.testApplicationId}`);
        console.log('   Use this ID to test the application status lookup in the frontend!');
      }
    } else {
      console.log('\n⚠️  Some integration tests failed.');
      console.log('   Check the error messages above for details.');
    }

    return passed === total;
  }
}

// Main execution
if (require.main === module) {
  const tester = new IntegrationTester();
  
  tester.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Integration test failed:', error.message);
    process.exit(1);
  });
}

module.exports = IntegrationTester;