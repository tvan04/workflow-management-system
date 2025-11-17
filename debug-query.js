const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const db = require('./backend/config/database');

async function debugQuery() {
  try {
    await db.connect();
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoMs = sevenDaysAgo.getTime();
    
    console.log('Seven days ago (ms):', sevenDaysAgoMs);
    console.log('Seven days ago (date):', sevenDaysAgo.toISOString());
    
    const query = `
      SELECT a.id, a.status, a.updated_at, a.faculty_name, sh.timestamp as last_status_change
      FROM applications a
      LEFT JOIN (
        SELECT application_id, MAX(timestamp) as timestamp
        FROM status_history 
        GROUP BY application_id
      ) sh ON a.id = sh.application_id
      WHERE a.status IN ('ccc_review', 'ccc_associate_dean_review', 'awaiting_primary_approval')
      AND (sh.timestamp IS NULL OR sh.timestamp < ?)
      AND a.updated_at < ?
    `;
    
    console.log('Executing query with parameters:', [sevenDaysAgoMs, sevenDaysAgoMs]);
    
    // First, let's test a simpler query
    const simpleRows = await db.all('SELECT id, status, updated_at FROM applications WHERE status = ? LIMIT 5', ['ccc_review']);
    console.log('Simple query result:', simpleRows);
    
    const rows = await db.all(query, [sevenDaysAgoMs, sevenDaysAgoMs]);
    
    console.log('Full query result:', rows);
    console.log('Found', rows.length, 'applications');
    
    await db.close();
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugQuery();