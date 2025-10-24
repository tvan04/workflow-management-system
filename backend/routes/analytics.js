const express = require('express');
const { query, validationResult } = require('express-validator');
const moment = require('moment');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');

const Application = require('../models/Application');
const db = require('../config/database');

const router = express.Router();

// GET /api/metrics - Get dashboard metrics
router.get('/', [
  query('timeframe').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid timeframe')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const metrics = await Application.getMetrics();
    
    res.json({
      data: metrics,
      message: 'Metrics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// GET /api/trends - Get processing time trends
router.get('/', async (req, res) => {
  try {
    // Get processing time trends by month for the last 12 months
    const query = `
      SELECT 
        strftime('%Y-%m', submitted_at) as month,
        COUNT(*) as applications,
        AVG(processing_time_weeks) as avg_processing_time,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM applications 
      WHERE submitted_at >= datetime('now', '-12 months')
      GROUP BY strftime('%Y-%m', submitted_at)
      ORDER BY month ASC
    `;

    const trends = await db.all(query);
    
    // Format the data for frontend charts
    const formattedTrends = trends.map(row => ({
      month: moment(row.month + '-01').format('MMM YYYY'),
      applications: row.applications,
      avgTime: parseFloat(row.avg_processing_time) || 0,
      completed: row.completed,
      rejected: row.rejected,
      completionRate: row.applications > 0 ? ((row.completed + row.rejected) / row.applications * 100) : 0
    }));

    res.json({
      data: formattedTrends,
      message: 'Processing trends retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch processing trends' });
  }
});

// GET /api/export - Export application data
router.get('/', [
  query('format').optional().isIn(['csv', 'json']).withMessage('Invalid format'),
  query('status').optional().isIn([
    'submitted', 'ccc_review', 'faculty_vote', 'awaiting_primary_approval',
    'approved', 'rejected', 'fis_entry_pending', 'completed'
  ]).withMessage('Invalid status filter'),
  query('startDate').optional().isDate().withMessage('Invalid start date'),
  query('endDate').optional().isDate().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const format = req.query.format || 'csv';
    const filters = {};
    
    if (req.query.status) {
      filters.status = req.query.status;
    }

    // Build query with date filters
    let query = `
      SELECT 
        a.*,
        f.name as faculty_name,
        f.email as faculty_email,
        f.title as faculty_title,
        f.department as faculty_department,
        f.college as faculty_college,
        f.institution as faculty_institution
      FROM applications a
      JOIN faculty_members f ON a.faculty_member_id = f.id
    `;

    const conditions = [];
    const params = [];

    if (req.query.status) {
      conditions.push('a.status = ?');
      params.push(req.query.status);
    }

    if (req.query.startDate) {
      conditions.push('DATE(a.submitted_at) >= DATE(?)');
      params.push(req.query.startDate);
    }

    if (req.query.endDate) {
      conditions.push('DATE(a.submitted_at) <= DATE(?)');
      params.push(req.query.endDate);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY a.submitted_at DESC';

    const applications = await db.all(query, params);

    if (format === 'json') {
      res.json({
        data: applications,
        exportedAt: new Date().toISOString(),
        count: applications.length
      });
      return;
    }

    // Generate CSV
    const exportDir = path.join(process.env.UPLOAD_DIR || './uploads', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filename = `applications_export_${moment().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
    const filepath = path.join(exportDir, filename);

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'id', title: 'Application ID' },
        { id: 'faculty_name', title: 'Faculty Name' },
        { id: 'faculty_email', title: 'Faculty Email' },
        { id: 'faculty_title', title: 'Faculty Title' },
        { id: 'faculty_department', title: 'Department' },
        { id: 'faculty_college', title: 'College' },
        { id: 'faculty_institution', title: 'Institution' },
        { id: 'status', title: 'Status' },
        { id: 'appointment_type', title: 'Appointment Type' },
        { id: 'effective_date', title: 'Effective Date' },
        { id: 'duration', title: 'Duration' },
        { id: 'submitted_at', title: 'Submitted At' },
        { id: 'updated_at', title: 'Updated At' },
        { id: 'current_approver', title: 'Current Approver' },
        { id: 'fis_entered', title: 'FIS Entered' },
        { id: 'fis_entry_date', title: 'FIS Entry Date' },
        { id: 'processing_time_weeks', title: 'Processing Time (Weeks)' },
        { id: 'dean_name', title: 'Dean Name' },
        { id: 'dean_email', title: 'Dean Email' },
        { id: 'department_chair_name', title: 'Department Chair Name' },
        { id: 'department_chair_email', title: 'Department Chair Email' }
      ]
    });

    await csvWriter.writeRecords(applications);

    // Return download URL
    const downloadUrl = `/uploads/exports/${filename}`;
    
    res.json({
      data: { 
        downloadUrl,
        filename,
        count: applications.length,
        exportedAt: new Date().toISOString()
      },
      message: 'Export completed successfully'
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// GET /api/analytics/status-distribution - Get application status distribution
router.get('/status-distribution', async (req, res) => {
  try {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM applications), 2) as percentage
      FROM applications 
      GROUP BY status
      ORDER BY count DESC
    `;

    const distribution = await db.all(query);
    
    res.json({
      data: distribution,
      message: 'Status distribution retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching status distribution:', error);
    res.status(500).json({ error: 'Failed to fetch status distribution' });
  }
});

// GET /api/analytics/college-breakdown - Get applications by college
router.get('/college-breakdown', async (req, res) => {
  try {
    const query = `
      SELECT 
        f.college,
        COUNT(*) as total_applications,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN a.status IN ('submitted', 'ccc_review', 'faculty_vote', 'awaiting_primary_approval', 'approved', 'fis_entry_pending') THEN 1 END) as in_progress,
        AVG(CASE WHEN a.processing_time_weeks IS NOT NULL THEN a.processing_time_weeks END) as avg_processing_time
      FROM applications a
      JOIN faculty_members f ON a.faculty_member_id = f.id
      GROUP BY f.college
      ORDER BY total_applications DESC
    `;

    const breakdown = await db.all(query);
    
    res.json({
      data: breakdown,
      message: 'College breakdown retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching college breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch college breakdown' });
  }
});

// GET /api/analytics/performance-metrics - Get detailed performance metrics
router.get('/performance-metrics', async (req, res) => {
  try {
    const queries = await Promise.all([
      // Total applications by timeframe
      db.all(`
        SELECT 
          'This Week' as period,
          COUNT(*) as count
        FROM applications 
        WHERE submitted_at >= datetime('now', '-7 days')
        UNION ALL
        SELECT 
          'This Month' as period,
          COUNT(*) as count
        FROM applications 
        WHERE submitted_at >= datetime('now', '-30 days')
        UNION ALL
        SELECT 
          'This Quarter' as period,
          COUNT(*) as count
        FROM applications 
        WHERE submitted_at >= datetime('now', '-90 days')
      `),
      
      // Average processing times by status
      db.all(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(julianday('now') - julianday(submitted_at)) as avg_days_in_status
        FROM applications 
        WHERE status NOT IN ('completed', 'rejected')
        GROUP BY status
      `),
      
      // Stalled applications summary
      db.get(`
        SELECT 
          COUNT(*) as total_stalled,
          AVG(julianday('now') - julianday(updated_at)) as avg_stall_days
        FROM applications 
        WHERE status NOT IN ('completed', 'rejected')
        AND datetime(updated_at) < datetime('now', '-7 days')
      `)
    ]);

    const [timeframeCounts, statusTimes, stalledSummary] = queries;

    res.json({
      data: {
        applicationsByTimeframe: timeframeCounts,
        averageTimeByStatus: statusTimes,
        stalledApplicationsSummary: stalledSummary
      },
      message: 'Performance metrics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

module.exports = router;