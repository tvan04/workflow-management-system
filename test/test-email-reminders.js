#!/usr/bin/env node

// Test script for email reminder functionality
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const EmailReminderService = require('../backend/services/EmailReminderService');
const db = require('../backend/config/database');

async function testEmailReminders() {
  console.log('=== Testing Email Reminder System ===');
  
  try {
    // Initialize database connection
    await db.connect();
    await db.createTables();
    
    // Create reminder service instance
    const reminderService = new EmailReminderService();
    
    console.log('\n1. Getting stuck applications...');
    const stuckApplications = await reminderService.getStuckApplications();
    console.log(`Found ${stuckApplications.length} stuck applications`);
    
    if (stuckApplications.length === 0) {
      console.log('\n2. Creating test application with old timestamp...');
      
      // Create a test application that's been stuck for more than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 8); // 8 days ago
      
      const testApplicationData = {
        facultyName: 'Test Faculty',
        facultyEmail: 'test.faculty@vanderbilt.edu',
        facultyTitle: 'Professor',
        facultyDepartment: 'Computer Science',
        facultyCollege: 'School of Engineering',
        facultyInstitution: 'vanderbilt',
        appointmentType: 'secondary',
        contributionsQuestion: 'Test contributions',
        alignmentQuestion: 'Test alignment',
        enhancementQuestion: 'Test enhancement',
        departmentChairName: 'Test Chair',
        departmentChairEmail: 'chair@vanderbilt.edu',
        deanName: 'Test Dean', 
        deanEmail: 'dean@vanderbilt.edu'
      };
      
      // Create and save test application using the Application model
      const Application = require('../backend/models/Application');
      const testApp = new Application({
        ...testApplicationData,
        status: 'ccc_review', // Status that qualifies for reminders
        submittedAt: sevenDaysAgo.getTime(),
        updatedAt: sevenDaysAgo.getTime()
      });
      
      await testApp.save();
      const testId = testApp.id;
      
      console.log(`Created test application: ${testId}`);
      
      // Check again for stuck applications
      const stuckAppsAfterCreate = await reminderService.getStuckApplications();
      console.log(`Found ${stuckAppsAfterCreate.length} stuck applications after creating test`);
    }
    
    console.log('\n3. Testing reminder check and send...');
    const result = await reminderService.checkAndSendReminders();
    console.log(`Reminder check result:`, result);
    
    console.log('\n4. Getting reminder statistics...');
    const stats = await reminderService.getReminderStats();
    console.log('Reminder stats:', stats);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    try {
      await db.close();
    } catch (closeError) {
      console.error('Error closing database:', closeError.message);
    }
  }
}

// Run the test
testEmailReminders();