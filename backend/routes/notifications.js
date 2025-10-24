const express = require('express');
const { body, validationResult } = require('express-validator');

const NotificationService = require('../services/NotificationService');
const db = require('../config/database');

const router = express.Router();

// POST /api/notifications/send - Send manual notification
router.post('/send', [
  body('applicationId').optional().trim(),
  body('type').isIn(['status_change', 'reminder', 'approval_request', 'custom']).withMessage('Invalid notification type'),
  body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
  body('recipients.*').isEmail().withMessage('All recipients must be valid email addresses'),
  body('subject').optional().trim().notEmpty().withMessage('Subject cannot be empty if provided'),
  body('message').optional().trim().notEmpty().withMessage('Message cannot be empty if provided')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { applicationId, type, recipients, subject, message } = req.body;
    
    let emailSubject, emailMessage;
    
    if (type === 'custom') {
      if (!subject || !message) {
        return res.status(400).json({ 
          error: 'Subject and message are required for custom notifications' 
        });
      }
      emailSubject = subject;
      emailMessage = message;
    } else {
      // Use default templates for system notifications
      emailSubject = `CCC Workflow Notification - ${type.replace('_', ' ')}`;
      emailMessage = message || 'This is an automated notification from the CCC workflow system.';
    }

    // Send email to all recipients
    const results = [];
    for (const recipient of recipients) {
      try {
        await NotificationService.sendEmail(recipient, emailSubject, emailMessage);
        results.push({ recipient, status: 'sent' });
      } catch (error) {
        console.error(`Failed to send notification to ${recipient}:`, error);
        results.push({ recipient, status: 'failed', error: error.message });
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    
    res.json({
      data: { 
        sent: sentCount === recipients.length,
        results,
        sentCount,
        totalCount: recipients.length
      },
      message: `Sent ${sentCount}/${recipients.length} notifications`
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// POST /api/notifications/bulk-reminders - Send reminders for stalled applications
router.post('/bulk-reminders', async (req, res) => {
  try {
    const count = await NotificationService.sendBulkReminders();
    
    res.json({
      data: { remindersSent: count },
      message: `Sent reminders for ${count} stalled applications`
    });
  } catch (error) {
    console.error('Error sending bulk reminders:', error);
    res.status(500).json({ error: 'Failed to send bulk reminders' });
  }
});

// GET /api/notifications/templates - Get notification templates
router.get('/templates', async (req, res) => {
  try {
    const query = 'SELECT * FROM notification_templates ORDER BY name ASC';
    const templates = await db.all(query);
    
    res.json({
      data: templates,
      message: `Found ${templates.length} notification templates`
    });
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    res.status(500).json({ error: 'Failed to fetch notification templates' });
  }
});

// POST /api/notifications/templates - Create notification template
router.post('/templates', [
  body('name').trim().notEmpty().withMessage('Template name is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('bodyText').trim().notEmpty().withMessage('Body text is required'),
  body('type').isIn(['status_change', 'reminder', 'approval_request']).withMessage('Invalid template type'),
  body('recipientRole').isIn(['faculty', 'chair', 'dean', 'ccc_staff']).withMessage('Invalid recipient role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, subject, bodyText, bodyHtml, type, recipientRole } = req.body;
    const id = require('uuid').v4();

    const query = `
      INSERT INTO notification_templates (id, name, subject, body_text, body_html, type, recipient_role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.run(query, [id, name, subject, bodyText, bodyHtml || null, type, recipientRole]);
    
    const template = await db.get('SELECT * FROM notification_templates WHERE id = ?', [id]);
    
    res.status(201).json({
      data: template,
      message: 'Notification template created successfully'
    });
  } catch (error) {
    console.error('Error creating notification template:', error);
    res.status(500).json({ error: 'Failed to create notification template' });
  }
});

// PUT /api/notifications/templates/:id - Update notification template
router.put('/templates/:id', [
  body('name').optional().trim().notEmpty().withMessage('Template name cannot be empty'),
  body('subject').optional().trim().notEmpty().withMessage('Subject cannot be empty'),
  body('bodyText').optional().trim().notEmpty().withMessage('Body text cannot be empty'),
  body('type').optional().isIn(['status_change', 'reminder', 'approval_request']).withMessage('Invalid template type'),
  body('recipientRole').optional().isIn(['faculty', 'chair', 'dean', 'ccc_staff']).withMessage('Invalid recipient role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Check if template exists
    const existingTemplate = await db.get('SELECT * FROM notification_templates WHERE id = ?', [req.params.id]);
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Notification template not found' });
    }

    const updates = {};
    const fields = ['name', 'subject', 'bodyText', 'bodyHtml', 'type', 'recipientRole'];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates[dbField] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.updated_at = new Date().toISOString();

    const updateFields = Object.keys(updates).map(field => `${field} = ?`).join(', ');
    const updateValues = Object.values(updates);
    updateValues.push(req.params.id);

    const query = `UPDATE notification_templates SET ${updateFields} WHERE id = ?`;
    await db.run(query, updateValues);

    const updatedTemplate = await db.get('SELECT * FROM notification_templates WHERE id = ?', [req.params.id]);
    
    res.json({
      data: updatedTemplate,
      message: 'Notification template updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification template:', error);
    res.status(500).json({ error: 'Failed to update notification template' });
  }
});

// DELETE /api/notifications/templates/:id - Delete notification template
router.delete('/templates/:id', async (req, res) => {
  try {
    const existingTemplate = await db.get('SELECT * FROM notification_templates WHERE id = ?', [req.params.id]);
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Notification template not found' });
    }

    await db.run('DELETE FROM notification_templates WHERE id = ?', [req.params.id]);
    
    res.json({
      data: { deleted: true },
      message: 'Notification template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification template:', error);
    res.status(500).json({ error: 'Failed to delete notification template' });
  }
});

// GET /api/notifications/log - Get notification log
router.get('/log', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        nl.*,
        a.id as application_id,
        f.name as faculty_name
      FROM notifications_log nl
      LEFT JOIN applications a ON nl.application_id = a.id
      LEFT JOIN faculty_members f ON a.faculty_member_id = f.id
      ORDER BY nl.sent_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = 'SELECT COUNT(*) as total FROM notifications_log';
    
    const [notifications, countResult] = await Promise.all([
      db.all(query, [limit, offset]),
      db.get(countQuery)
    ]);

    res.json({
      data: notifications,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      },
      message: `Retrieved ${notifications.length} notification log entries`
    });
  } catch (error) {
    console.error('Error fetching notification log:', error);
    res.status(500).json({ error: 'Failed to fetch notification log' });
  }
});

module.exports = router;