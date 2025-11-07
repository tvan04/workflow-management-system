const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult, query } = require('express-validator');

const Application = require('../models/Application');
const FacultyMember = require('../models/FacultyMember');
const EmailService = require('../services/EmailService');
const NotificationService = require('../services/NotificationService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  }
});

// Validation middleware
const validateApplication = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('college').trim().notEmpty().withMessage('College is required'),
  body('appointmentType').isIn(['initial', 'secondary']).withMessage('Valid appointment type is required'),
  body('effectiveDate').optional({ values: 'falsy' }).isDate().withMessage('Valid effective date is required'),
  body('duration').isIn(['1year', '2year', '3year']).withMessage('Valid duration is required'),
  body('rationale').trim().notEmpty().withMessage('Rationale is required'),
  body('deanName').trim().notEmpty().withMessage('Dean name is required'),
  body('deanEmail').isEmail().withMessage('Valid dean email is required'),
  
  // Custom email validation
  body('email').custom(value => {
    if (!FacultyMember.validateEmail(value)) {
      throw new Error('Email must be from Vanderbilt (@vanderbilt.edu) or VUMC (@vumc.org)');
    }
    return true;
  }),
  
  // Conditional validation for department chair (if college has departments)
  body('departmentChairName').custom((value, { req }) => {
    if (req.body.collegeHasDepartments === 'true' || req.body.collegeHasDepartments === true) {
      if (!value || value.trim().length === 0) {
        throw new Error('Department chair name is required for colleges with departments');
      }
    }
    return true;
  }),
  
  body('departmentChairEmail').custom((value, { req }) => {
    if (req.body.collegeHasDepartments === 'true' || req.body.collegeHasDepartments === true) {
      if (!value || !FacultyMember.validateEmail(value)) {
        throw new Error('Valid department chair email is required for colleges with departments');
      }
    }
    return true;
  })
];

// GET /api/applications - Get all applications with optional filtering
router.get('/', [
  query('status').optional().isIn([
    'submitted', 'ccc_review', 'awaiting_primary_approval',
    'rejected', 'fis_entry_pending', 'completed',
    // Legacy statuses for filtering backward compatibility
    'faculty_vote', 'approved'
  ]).withMessage('Invalid status filter'),
  query('college').optional().trim(),
  query('institution').optional().isIn(['vanderbilt', 'vumc']).withMessage('Invalid institution filter')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.college) filters.college = req.query.college;
    if (req.query.institution) filters.institution = req.query.institution;

    const applications = await Application.findAll(filters);
    
    res.json({
      data: applications.map(app => app.toJSON()),
      message: `Found ${applications.length} applications`
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET /api/applications/search - Search applications
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const applications = await Application.search(req.query.q);
    
    res.json({
      data: applications.map(app => app.toJSON()),
      message: `Found ${applications.length} applications matching "${req.query.q}"`
    });
  } catch (error) {
    console.error('Error searching applications:', error);
    res.status(500).json({ error: 'Failed to search applications' });
  }
});

// GET /api/applications/my-applications - Get applications for current user by email
router.get('/my-applications', [
  query('email').isEmail().withMessage('Valid email address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Use the existing search method with exact email match
    const applications = await Application.search(req.query.email);
    
    // Filter to exact email matches only (since search uses LIKE which could be partial matches)
    const exactMatches = applications.filter(app => 
      app.facultyMember && app.facultyMember.email === req.query.email
    );
    
    res.json({
      data: exactMatches.map(app => app.toJSON()),
      message: `Found ${exactMatches.length} applications for ${req.query.email}`
    });
  } catch (error) {
    console.error('Error fetching user applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET /api/applications/:id - Get application by ID
router.get('/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get status history
    const statusHistory = await application.getStatusHistory();
    const result = application.toJSON();
    result.statusHistory = statusHistory;
    
    res.json({
      data: result
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// POST /api/applications - Submit new application
router.post('/', upload.single('cvFile'), validateApplication, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'CV file is required' });
    }

    // Create or find faculty member
    const facultyData = {
      name: req.body.name,
      email: req.body.email,
      title: req.body.title,
      department: req.body.department,
      college: req.body.college,
      institution: FacultyMember.validateInstitution(req.body.email)
    };

    const faculty = await FacultyMember.findOrCreate(facultyData);

    // Create application
    const applicationData = {
      facultyMemberId: faculty.id,
      appointmentType: req.body.appointmentType,
      effectiveDate: req.body.effectiveDate || null,
      duration: req.body.duration,
      rationale: req.body.rationale,
      cvFilePath: req.file.path,
      cvFileName: req.file.originalname,
      
      // Approval chain
      departmentChairName: req.body.departmentChairName,
      departmentChairEmail: req.body.departmentChairEmail,
      divisionChairName: req.body.divisionChairName,
      divisionChairEmail: req.body.divisionChairEmail,
      deanName: req.body.deanName,
      deanEmail: req.body.deanEmail,
      seniorAssociateDeanName: req.body.seniorAssociateDeanName,
      seniorAssociateDeanEmail: req.body.seniorAssociateDeanEmail,
      hasDepartments: req.body.collegeHasDepartments === 'true' || req.body.collegeHasDepartments === true
    };

    const application = new Application(applicationData);
    await application.save();

    // Add faculty member data for response
    application.facultyMember = faculty.toJSON();

    // Send notification to faculty and CCC staff
    try {
      const notificationService = new NotificationService();
      await notificationService.sendApplicationSubmittedNotification(application);
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      data: { applicationId: application.id },
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Error creating application:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// PATCH /api/applications/:id/status - Update application status
router.patch('/:id/status', [
  body('status').isIn([
    'submitted', 'ccc_review', 'awaiting_primary_approval',
    'rejected', 'fis_entry_pending', 'completed',
    // Legacy statuses (will be converted)
    'faculty_vote', 'approved'
  ]).withMessage('Invalid status'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    let { status, notes } = req.body;
    const approver = req.body.approver || 'System'; // In a real app, this would come from auth

    // Convert legacy statuses to new workflow
    if (status === 'faculty_vote') {
      status = 'awaiting_primary_approval';
      notes = notes ? `${notes} [Converted from legacy faculty_vote status]` : 'Converted from legacy faculty_vote status';
    } else if (status === 'approved') {
      status = 'fis_entry_pending';
      notes = notes ? `${notes} [Converted from legacy approved status]` : 'Converted from legacy approved status';
    }

    await application.updateStatus(status, approver, notes);

    // Send status change notifications
    try {
      const notificationService = new NotificationService();
      await notificationService.sendStatusChangeNotification(application, status);
    } catch (error) {
      console.error('Failed to send status change notification:', error.message);
      // Don't fail the status update if notification fails
    }

    res.json({
      data: application.toJSON(),
      message: `Application status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// Reminder functionality removed - no longer available

// PUT /api/applications/:id - Update application (admin only)
router.put('/:id', [
  body('fisEntered').optional().isBoolean().withMessage('FIS entered must be boolean'),
  body('processingTimeWeeks').optional().isNumeric().withMessage('Processing time must be numeric'),
  body('primaryAppointmentEndDate').optional().isDate().withMessage('Valid end date required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const updates = {};
    if (req.body.fisEntered !== undefined) {
      updates.fisEntered = req.body.fisEntered;
      if (req.body.fisEntered) {
        updates.fisEntryDate = new Date();
      }
    }
    if (req.body.processingTimeWeeks !== undefined) {
      updates.processingTimeWeeks = parseFloat(req.body.processingTimeWeeks);
    }
    if (req.body.primaryAppointmentEndDate) {
      updates.primaryAppointmentEndDate = req.body.primaryAppointmentEndDate;
    }

    await application.update(updates);

    res.json({
      data: application.toJSON(),
      message: 'Application updated successfully'
    });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// POST /api/applications/:id/approve - Process approval from signature page
router.post('/:id/approve', [
  body('approverEmail').isEmail().withMessage('Valid approver email is required'),
  body('action').isIn(['approve', 'deny']).withMessage('Action must be approve or deny'),
  body('signature').trim().notEmpty().withMessage('Signature is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const { approverEmail, action, signature, notes } = req.body;

    // Determine new status based on action
    let newStatus;
    let approverName = signature; // Use signature as approver name
    
    if (action === 'approve') {
      // Move to next step in approval chain
      switch (application.status) {
        case 'ccc_review':
          newStatus = 'awaiting_primary_approval';
          break;
        case 'awaiting_primary_approval':
          newStatus = 'approved';
          break;
        default:
          newStatus = 'approved';
      }
    } else {
      newStatus = 'rejected';
    }

    // Update application status
    await application.updateStatus(newStatus, approverName, notes || `${action === 'approve' ? 'Approved' : 'Denied'} by ${signature}`);

    // Send notification about status change
    try {
      const notificationService = new NotificationService();
      await notificationService.sendStatusChangeNotification(application, newStatus);
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

    res.json({
      data: { success: true, newStatus },
      message: `Application ${action === 'approve' ? 'approved' : 'denied'} successfully`
    });
  } catch (error) {
    console.error('Error processing approval:', error);
    res.status(500).json({ error: 'Failed to process approval' });
  }
});

module.exports = router;