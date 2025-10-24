const express = require('express');
const { body, validationResult } = require('express-validator');

const db = require('../config/database');

const router = express.Router();

// GET /api/settings - Get all system settings
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT * FROM system_settings ORDER BY key ASC';
    const settings = await db.all(query);
    
    // Convert to object for easier use
    const settingsObject = {};
    settings.forEach(setting => {
      settingsObject[setting.key] = {
        value: setting.value,
        description: setting.description,
        updatedAt: setting.updated_at
      };
    });
    
    res.json({
      data: settingsObject,
      message: `Retrieved ${settings.length} system settings`
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// GET /api/settings/:key - Get specific setting
router.get('/:key', async (req, res) => {
  try {
    const query = 'SELECT * FROM system_settings WHERE key = ?';
    const setting = await db.get(query, [req.params.key]);
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json({
      data: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        updatedAt: setting.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// PUT /api/settings - Update multiple settings
router.put('/', [
  body('settings').isObject().withMessage('Settings must be an object'),
  body('settings.*').notEmpty().withMessage('Setting values cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { settings } = req.body;
    const updatedSettings = [];

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      const query = `
        INSERT OR REPLACE INTO system_settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `;
      
      await db.run(query, [key, value, new Date().toISOString()]);
      updatedSettings.push({ key, value });
    }
    
    res.json({
      data: updatedSettings,
      message: `Updated ${updatedSettings.length} system settings`
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

// PUT /api/settings/:key - Update specific setting
router.put('/:key', [
  body('value').notEmpty().withMessage('Setting value is required'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { value, description } = req.body;
    
    const query = `
      INSERT OR REPLACE INTO system_settings (key, value, description, updated_at)
      VALUES (?, ?, ?, ?)
    `;
    
    await db.run(query, [req.params.key, value, description || null, new Date().toISOString()]);
    
    const updatedSetting = await db.get('SELECT * FROM system_settings WHERE key = ?', [req.params.key]);
    
    res.json({
      data: updatedSetting,
      message: `Setting '${req.params.key}' updated successfully`
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// DELETE /api/settings/:key - Delete setting
router.delete('/:key', async (req, res) => {
  try {
    const existingSetting = await db.get('SELECT * FROM system_settings WHERE key = ?', [req.params.key]);
    if (!existingSetting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    await db.run('DELETE FROM system_settings WHERE key = ?', [req.params.key]);
    
    res.json({
      data: { deleted: true },
      message: `Setting '${req.params.key}' deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

module.exports = router;