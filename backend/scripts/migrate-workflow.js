const db = require('../config/database');

async function migrateWorkflow() {
  console.log('Starting workflow migration...');
  
  try {
    // Update applications with old 'faculty_vote' status to 'awaiting_primary_approval'
    const facultyVoteResult = await db.run(
      `UPDATE applications SET status = 'awaiting_primary_approval' WHERE status = 'faculty_vote'`
    );
    console.log(`Updated ${facultyVoteResult.changes} applications from 'faculty_vote' to 'awaiting_primary_approval'`);
    
    // Update applications with old 'approved' status to 'fis_entry_pending'
    const approvedResult = await db.run(
      `UPDATE applications SET status = 'fis_entry_pending' WHERE status = 'approved'`
    );
    console.log(`Updated ${approvedResult.changes} applications from 'approved' to 'fis_entry_pending'`);
    
    // Update status history entries
    const historyFacultyVoteResult = await db.run(
      `UPDATE status_history SET status = 'awaiting_primary_approval' WHERE status = 'faculty_vote'`
    );
    console.log(`Updated ${historyFacultyVoteResult.changes} status history entries from 'faculty_vote' to 'awaiting_primary_approval'`);
    
    const historyApprovedResult = await db.run(
      `UPDATE status_history SET status = 'fis_entry_pending' WHERE status = 'approved'`
    );
    console.log(`Updated ${historyApprovedResult.changes} status history entries from 'approved' to 'fis_entry_pending'`);
    
    console.log('✅ Workflow migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during workflow migration:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateWorkflow().then(() => process.exit(0));
}

module.exports = migrateWorkflow;