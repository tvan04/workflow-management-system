#!/usr/bin/env node

/**
 * Test Dashboard and Lookup Fixes
 * 
 * This script verifies that:
 * 1. Dashboard shows real applications from database
 * 2. Lookup works with seeded data
 * 3. All API endpoints return correct data
 */

const axios = require('axios');

class DashboardLookupTester {
  constructor() {
    this.API_BASE = 'http://localhost:3001/api';
    this.seededApplications = [];
  }

  async testDashboardAPI() {
    console.log('\n📊 Testing Dashboard API Endpoints...');
    
    try {
      // Test applications endpoint (used by dashboard)
      console.log('1. Testing GET /api/applications...');
      const appsResponse = await axios.get(`${this.API_BASE}/applications`);
      const applications = appsResponse.data.data;
      
      console.log(`✅ Found ${applications.length} applications in database`);
      
      if (applications.length > 0) {
        console.log('   Sample applications:');
        applications.forEach(app => {
          console.log(`   - ${app.id}: ${app.facultyMember.name} (${app.status})`);
        });
        this.seededApplications = applications;
      } else {
        console.log('❌ No applications found in database');
        return false;
      }

      // Test metrics endpoint (used by dashboard)
      console.log('\n2. Testing GET /api/metrics...');
      const metricsResponse = await axios.get(`${this.API_BASE}/metrics`);
      const metrics = metricsResponse.data.data;
      
      console.log(`✅ Metrics retrieved successfully`);
      console.log(`   Total Applications: ${metrics.totalApplications}`);
      console.log(`   Average Processing Time: ${metrics.averageProcessingTime} weeks`);
      console.log(`   Stalled Applications: ${metrics.stalledApplications.length}`);
      console.log('   Applications by Status:');
      
      Object.entries(metrics.applicationsByStatus).forEach(([status, count]) => {
        if (count > 0) {
          console.log(`     ${status}: ${count}`);
        }
      });

      if (metrics.totalApplications !== applications.length) {
        console.log(`⚠️  Metrics total (${metrics.totalApplications}) doesn't match applications count (${applications.length})`);
      } else {
        console.log('✅ Metrics match application count');
      }

      return true;
    } catch (error) {
      console.error('❌ Dashboard API test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testApplicationLookup() {
    console.log('\n🔍 Testing Application Lookup with Seeded Data...');
    
    if (this.seededApplications.length === 0) {
      console.log('❌ No seeded applications to test with');
      return false;
    }

    try {
      // Test lookup by application ID
      console.log('1. Testing lookup by Application ID...');
      for (const app of this.seededApplications.slice(0, 3)) { // Test first 3
        const response = await axios.get(`${this.API_BASE}/applications/${app.id}`);
        const foundApp = response.data.data;
        
        if (foundApp.id === app.id) {
          console.log(`✅ ID lookup works: ${app.id} -> ${foundApp.facultyMember.name}`);
        } else {
          console.log(`❌ ID lookup failed for ${app.id}`);
          return false;
        }
      }

      // Test search by email
      console.log('\n2. Testing search by email...');
      const uniqueEmails = [...new Set(this.seededApplications.map(app => app.facultyMember.email))];
      
      for (const email of uniqueEmails.slice(0, 3)) { // Test first 3 unique emails
        const searchResponse = await axios.get(`${this.API_BASE}/applications/search?q=${encodeURIComponent(email)}`);
        const results = searchResponse.data.data;
        
        if (results.length > 0) {
          console.log(`✅ Email search works: "${email}" -> ${results.length} results`);
          console.log(`   First result: ${results[0].facultyMember.name} (${results[0].id})`);
        } else {
          console.log(`❌ Email search failed for "${email}" - no results`);
          return false;
        }
      }

      // Test search by name
      console.log('\n3. Testing search by name...');
      const testNames = ['Sarah', 'Johnson', 'Michael', 'Brown'];
      
      for (const nameQuery of testNames) {
        const searchResponse = await axios.get(`${this.API_BASE}/applications/search?q=${encodeURIComponent(nameQuery)}`);
        const results = searchResponse.data.data;
        
        console.log(`🔎 Name search "${nameQuery}": ${results.length} results`);
        if (results.length > 0) {
          console.log(`   Sample: ${results[0].facultyMember.name}`);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Application lookup test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testSeededDataExamples() {
    console.log('\n📋 Testing Specific Seeded Data Examples...');
    
    const testCases = [
      {
        description: 'Dr. Sarah Johnson (Engineering)',
        email: 'sarah.johnson@vanderbilt.edu',
        expectedName: 'Dr. Sarah Johnson'
      },
      {
        description: 'Dr. Michael Brown (VUMC)',
        email: 'michael.brown@vumc.org',
        expectedName: 'Dr. Michael Brown'
      },
      {
        description: 'Dr. Emily Davis (Arts & Science)',
        email: 'emily.davis@vanderbilt.edu',
        expectedName: 'Dr. Emily Davis'
      }
    ];

    let allPassed = true;

    for (const testCase of testCases) {
      try {
        console.log(`\nTesting: ${testCase.description}`);
        
        // Test email search
        const emailSearch = await axios.get(`${this.API_BASE}/applications/search?q=${encodeURIComponent(testCase.email)}`);
        const emailResults = emailSearch.data.data;
        
        if (emailResults.length > 0 && emailResults[0].facultyMember.name === testCase.expectedName) {
          console.log(`✅ Email search successful: ${testCase.email} -> ${emailResults[0].facultyMember.name}`);
          console.log(`   Application ID: ${emailResults[0].id}`);
          console.log(`   Status: ${emailResults[0].status}`);
          console.log(`   College: ${emailResults[0].facultyMember.college}`);
          
          // Test direct ID lookup
          const idLookup = await axios.get(`${this.API_BASE}/applications/${emailResults[0].id}`);
          if (idLookup.data.data.id === emailResults[0].id) {
            console.log(`✅ Direct ID lookup works: ${emailResults[0].id}`);
          } else {
            console.log(`❌ Direct ID lookup failed for ${emailResults[0].id}`);
            allPassed = false;
          }
        } else {
          console.log(`❌ Email search failed for ${testCase.email}`);
          console.log(`   Expected: ${testCase.expectedName}, Got: ${emailResults.length > 0 ? emailResults[0].facultyMember.name : 'No results'}`);
          allPassed = false;
        }
      } catch (error) {
        console.log(`❌ Test failed for ${testCase.description}:`, error.response?.data || error.message);
        allPassed = false;
      }
    }

    return allPassed;
  }

  async testDashboardDataIntegration() {
    console.log('\n🎛️ Testing Dashboard Data Integration...');
    
    try {
      // This simulates what the Dashboard component does
      const [applicationsResponse, metricsResponse] = await Promise.all([
        axios.get(`${this.API_BASE}/applications`),
        axios.get(`${this.API_BASE}/metrics`)
      ]);

      const applications = applicationsResponse.data.data;
      const metrics = metricsResponse.data.data;

      console.log('Dashboard data loaded successfully:');
      console.log(`✅ Applications loaded: ${applications.length}`);
      console.log(`✅ Metrics loaded: Total ${metrics.totalApplications}`);
      
      // Test that applications have all required fields for dashboard
      const sampleApp = applications[0];
      const requiredFields = ['id', 'facultyMember', 'status', 'submittedAt', 'updatedAt'];
      const hasAllFields = requiredFields.every(field => sampleApp[field] !== undefined);
      
      if (hasAllFields) {
        console.log('✅ Applications have all required fields for dashboard');
      } else {
        console.log('❌ Applications missing required fields');
        return false;
      }

      // Test date parsing (what the frontend will do)
      applications.forEach(app => {
        const submittedAt = new Date(app.submittedAt);
        const updatedAt = new Date(app.updatedAt);
        
        if (isNaN(submittedAt.getTime()) || isNaN(updatedAt.getTime())) {
          console.log(`❌ Invalid dates in application ${app.id}`);
          return false;
        }
      });
      
      console.log('✅ All application dates can be parsed correctly');

      return true;
    } catch (error) {
      console.error('❌ Dashboard integration test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async run() {
    console.log('🔧 Dashboard and Lookup Fixes - Verification Test');
    console.log('==================================================');

    const tests = [
      { name: 'Dashboard API Endpoints', test: () => this.testDashboardAPI() },
      { name: 'Application Lookup', test: () => this.testApplicationLookup() },
      { name: 'Seeded Data Examples', test: () => this.testSeededDataExamples() },
      { name: 'Dashboard Data Integration', test: () => this.testDashboardDataIntegration() }
    ];

    const results = [];

    for (const { name, test } of tests) {
      try {
        const result = await test();
        results.push({ name, passed: result });
      } catch (error) {
        console.error(`❌ ${name} threw an error:`, error.message);
        results.push({ name, passed: false });
      }
    }

    // Results summary
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(({ name, passed }) => {
      console.log(`${passed ? '✅' : '❌'} ${name}`);
    });
    
    console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);

    if (passed === total) {
      console.log('\n🎉 ALL FIXES WORKING CORRECTLY!');
      console.log('\n✅ Issues Resolved:');
      console.log('   • Dashboard now shows real applications from database');
      console.log('   • Application lookup works with seeded data');
      console.log('   • All API endpoints return correct data');
      console.log('\n📝 Test with these seeded examples:');
      
      if (this.seededApplications.length > 0) {
        this.seededApplications.slice(0, 3).forEach(app => {
          console.log(`   • ID: ${app.id}`);
          console.log(`     Email: ${app.facultyMember.email}`);
          console.log(`     Name: ${app.facultyMember.name}`);
          console.log('');
        });
      }
    } else {
      console.log('\n⚠️  Some tests failed. Check the error messages above.');
    }

    return passed === total;
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new DashboardLookupTester();
  
  console.log('🔧 Make sure the backend server is running on http://localhost:3001');
  console.log('   The backend should be started with: cd backend && npm start\n');
  
  setTimeout(async () => {
    const success = await tester.run();
    process.exit(success ? 0 : 1);
  }, 1000);
}

module.exports = DashboardLookupTester;