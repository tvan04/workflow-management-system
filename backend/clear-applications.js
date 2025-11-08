#!/usr/bin/env node

require('dotenv').config();
const db = require('./config/database');

async function clearApplications() {
  try {
    console.log('🗑️  Clearing all applications from database...');
    
    // Connect to database
    await db.connect();
    
    // Clear applications and related data
    await db.run('DELETE FROM status_history WHERE application_id IN (SELECT id FROM applications)');
    console.log('✅ Cleared status history');
    
    await db.run('DELETE FROM applications');
    console.log('✅ Cleared applications table');
    
    // Optionally clear faculty members if you want to start completely fresh
    // await db.run('DELETE FROM faculty_members');
    // console.log('✅ Cleared faculty members');
    
    console.log('🎉 Database cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Confirm before proceeding
console.log('⚠️  WARNING: This will permanently delete ALL applications from the database!');
console.log('Type "yes" to confirm, or press Ctrl+C to cancel:');

process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
  const chunk = process.stdin.read();
  if (chunk !== null) {
    const input = chunk.trim().toLowerCase();
    if (input === 'yes') {
      clearApplications();
    } else {
      console.log('❌ Operation cancelled');
      process.exit(0);
    }
  }
});