#!/usr/bin/env node

// Test script to verify email content and recipient logic
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const db = require('../backend/config/database');
const EmailReminderService = require('../backend/services/EmailReminderService');

async function testEmailContent() {
  console.log('=== Testing Email Content and Recipient Logic ===');
  
  try {
    await db.connect();
    
    const reminderService = new EmailReminderService();
    
    // Get one stuck application to test email content
    const stuckApplications = await reminderService.getStuckApplications();
    
    if (stuckApplications.length > 0) {
      const testApp = stuckApplications[0];
      console.log('\nTesting email content for application:', testApp.id);
      console.log('Status:', testApp.status);
      console.log('Faculty:', testApp.facultyName);
      
      // Get reminder info for this application
      const reminderInfo = reminderService.determineReminderRecipient(testApp);
      console.log('\nReminder Info:', reminderInfo);
      
      // Get email content
      const daysStuck = reminderService.calculateDaysStuck(testApp);
      const emailContent = reminderService.generateReminderEmailContent(testApp, reminderInfo, daysStuck);
      console.log('\n=== Email Content ===');
      console.log('Days stuck:', daysStuck);
      console.log('\nText Content (first 300 chars):');
      console.log(emailContent.text.substring(0, 300) + '...');
      console.log('\nHTML Content (first 300 chars):');
      console.log(emailContent.html.substring(0, 300) + '...');
    } else {
      console.log('No stuck applications found for testing');
    }
    
    await db.close();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEmailContent();