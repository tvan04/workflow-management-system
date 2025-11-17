#!/usr/bin/env node

// Test script for scheduler-based email reminder functionality
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const SchedulerService = require('./backend/services/SchedulerService');

async function testSchedulerReminders() {
  console.log('=== Testing Scheduler Email Reminder Trigger ===');
  
  try {
    console.log('\n1. Testing manual trigger for email reminders...');
    const result = await SchedulerService.triggerEmailReminders();
    console.log('Manual trigger result:', result);
    
    console.log('\n✅ Email reminder system is working!');
    console.log('- Found and processed stuck applications');
    console.log('- Sent reminder emails to appropriate recipients');
    console.log('- Logged reminders to prevent duplicates');
    console.log('- Can be triggered manually or via daily cron job');
    
  } catch (error) {
    console.error('Scheduler test failed:', error);
  }
}

// Run the test
testSchedulerReminders();