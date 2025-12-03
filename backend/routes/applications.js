const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult, query } = require('express-validator');

const Application = require('../models/Application');
const FacultyMember = require('../models/FacultyMember');
const ApprovalTokenService = require('../services/ApprovalTokenService');
const EmailService = require('../services/EmailService');
const NotificationService = require('../services/NotificationService');

const router = express.Router();

// Configure multer for file uploads - using memory storage for database BLOB storage
const storage = multer.memoryStorage();

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

// College requirements helper function
const getCollegeRequirements = (collegeName) => {
  const colleges = {
    'School of Engineering': {
      hasDepartments: true,
      requiredApprovers: ['departmentChair', 'dean']
    },
    'College of Arts & Science': {
      hasDepartments: true,
      requiredApprovers: ['departmentChair', 'associateDean']
    },
    'School of Medicine - Basic Sciences': {
      hasDepartments: true,
      requiredApprovers: ['departmentChair']
    },
    'Owen Graduate School of Management': {
      hasDepartments: false,
      requiredApprovers: ['associateDean', 'dean']
    },
    'Blair School of Music': {
      hasDepartments: false,
      requiredApprovers: ['associateDean', 'dean']
    },
    'Peabody College': {
      hasDepartments: true,
      requiredApprovers: ['departmentChair', 'dean']
    },
    'School of Nursing': {
      hasDepartments: false,
      requiredApprovers: ['dean']
    },
    'Law School': {
      hasDepartments: false,
      requiredApprovers: ['viceDean']
    },
    'Divinity School': {
      hasDepartments: false,
      requiredApprovers: ['dean']
    },
  };
  
  return colleges[collegeName] || { hasDepartments: true, requiredApprovers: ['departmentChair'] };
};

// Validation middleware
const validateApplication = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('department').optional().trim(),
  body('college').trim().notEmpty().withMessage('College is required'),
  body('institution').trim().notEmpty().withMessage('Institution is required'),
  body('appointmentType').isIn(['initial', 'secondary']).withMessage('Valid appointment type is required'),
  body('effectiveDate').optional({ values: 'falsy' }).isDate().withMessage('Valid effective date is required'),
  body('contributionsQuestion').trim().notEmpty().withMessage('Contributions question is required'),
  body('alignmentQuestion').trim().notEmpty().withMessage('Alignment question is required'),
  body('enhancementQuestion').trim().notEmpty().withMessage('Enhancement question is required'),
  
  // Custom email validation
  body('email').custom(value => {
    if (!FacultyMember.validateEmail(value)) {
      throw new Error('Email must be from Vanderbilt (@vanderbilt.edu) or VUMC (@vumc.org)');
    }
    return true;
  }),
  
  // Dynamic validation based on college requirements
  body('departmentChairName').custom((value, { req }) => {
    const collegeReqs = getCollegeRequirements(req.body.college);
    if (collegeReqs.requiredApprovers.includes('departmentChair')) {
      if (!value || value.trim().length === 0) {
        throw new Error('Department chair name is required for this college');
      }
    }
    return true;
  }),
  
  body('departmentChairEmail').custom((value, { req }) => {
    const collegeReqs = getCollegeRequirements(req.body.college);
    if (collegeReqs.requiredApprovers.includes('departmentChair')) {
      if (!value || !FacultyMember.validateEmail(value)) {
        throw new Error('Valid department chair email is required for this college');
      }
    }
    return true;
  }),
  
  // Dynamic dean validation (also handles viceDean)
  body('deanName').custom((value, { req }) => {
    const collegeReqs = getCollegeRequirements(req.body.college);
    if (collegeReqs.requiredApprovers.includes('dean') || collegeReqs.requiredApprovers.includes('viceDean')) {
      if (!value || value.trim().length === 0) {
        const roleTitle = collegeReqs.requiredApprovers.includes('viceDean') ? 'Vice dean' : 'Dean';
        throw new Error(`${roleTitle} name is required for this college`);
      }
    }
    return true;
  }),
  
  body('deanEmail').custom((value, { req }) => {
    const collegeReqs = getCollegeRequirements(req.body.college);
    if (collegeReqs.requiredApprovers.includes('dean') || collegeReqs.requiredApprovers.includes('viceDean')) {
      if (!value || !FacultyMember.validateEmail(value)) {
        const roleTitle = collegeReqs.requiredApprovers.includes('viceDean') ? 'vice dean' : 'dean';
        throw new Error(`Valid ${roleTitle} email is required for this college`);
      }
    }
    return true;
  }),
  
  // Dynamic associate dean validation  
  body('seniorAssociateDeanName').custom((value, { req }) => {
    const collegeReqs = getCollegeRequirements(req.body.college);
    if (collegeReqs.requiredApprovers.includes('associateDean')) {
      if (!value || value.trim().length === 0) {
        throw new Error('Senior associate dean name is required for this college');
      }
    }
    return true;
  }),
  
  body('seniorAssociateDeanEmail').custom((value, { req }) => {
    const collegeReqs = getCollegeRequirements(req.body.college);
    if (collegeReqs.requiredApprovers.includes('associateDean')) {
      if (!value || !FacultyMember.validateEmail(value)) {
        throw new Error('Valid senior associate dean email is required for this college');
      }
    }
    return true;
  }),

  // Note: Vice dean validation uses dean fields (deanName, deanEmail)
  // This is handled by the existing dean validation above
];

// GET /api/applications - Get all applications with optional filtering
router.get('/', [
  query('status').optional().isIn([
    'submitted', 'ccc_review', 'ccc_associate_dean_review', 'awaiting_primary_approval',
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

    // Query applications directly by faculty email (embedded data)
    const applications = await Application.findAll({ 
      faculty_email: req.query.email 
    });
    
    // Since we're querying directly by email, all results should be exact matches
    const exactMatches = applications;
    
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
  console.log('=== APPLICATION SUBMISSION START ===');
  console.log('Request body name:', req.body.name);
  console.log('Request timestamp:', new Date().toISOString());
  console.log('College:', req.body.college);
  console.log('College requirements:', getCollegeRequirements(req.body.college));
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'CV file is required' });
    }

    // Create application with embedded faculty data
    const applicationData = {
      // Faculty information
      facultyName: req.body.name,
      facultyEmail: req.body.email,
      facultyTitle: req.body.title,
      facultyDepartment: req.body.department,
      facultyCollege: req.body.college,
      facultyInstitution: FacultyMember.validateInstitution(req.body.email),
      appointmentType: req.body.appointmentType,
      effectiveDate: null, // No longer collected
      duration: null, // No longer collected
      contributionsQuestion: req.body.contributionsQuestion,
      alignmentQuestion: req.body.alignmentQuestion,
      enhancementQuestion: req.body.enhancementQuestion,
      cvFileName: req.file.originalname,
      cvFileData: req.file.buffer, // Store file data as BLOB
      cvFileSize: req.file.size,
      cvMimeType: req.file.mimetype,
      
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
    console.log('About to save application with ID:', application.id);
    await application.save();
    console.log('Application saved successfully with ID:', application.id);

    // Send notification to faculty and CCC staff
    try {
      const notificationService = new NotificationService();
      await notificationService.sendApplicationSubmittedNotification(application);
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

    console.log('=== APPLICATION SUBMISSION END ===');
    res.status(201).json({
      data: { applicationId: application.id },
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// PATCH /api/applications/:id/status - Update application status
router.patch('/:id/status', [
  body('status').isIn([
    'submitted', 'ccc_review', 'ccc_associate_dean_review', 'awaiting_primary_approval',
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
  // Admin-only fields
  body('fisEntered').optional().isBoolean().withMessage('FIS entered must be boolean'),
  body('processingTimeWeeks').optional().isNumeric().withMessage('Processing time must be numeric'),
  body('primaryAppointmentStartDate').optional().isISO8601().withMessage('Valid start date required'),
  body('primaryAppointmentEndDate').optional().isISO8601().withMessage('Valid end date required'),
  
  // Application fields
  body('status').optional().isIn([
    'submitted', 'ccc_review', 'ccc_associate_dean_review', 'awaiting_primary_approval',
    'rejected', 'fis_entry_pending', 'completed'
  ]).withMessage('Invalid status'),
  body('currentApprover').optional().trim(),
  
  // Question fields
  body('contributionsQuestion').optional().trim(),
  body('alignmentQuestion').optional().trim(),
  body('enhancementQuestion').optional().trim(),
  
  // Approver fields
  body('approvers.departmentChair.name').optional().trim(),
  body('approvers.departmentChair.email').optional().trim().custom((value) => {
    if (value && value.length > 0 && !value.includes('@')) {
      throw new Error('Department Chair email must be valid if provided');
    }
    return true;
  }),
  body('approvers.divisionChair.name').optional().trim(),
  body('approvers.divisionChair.email').optional().trim().custom((value) => {
    if (value && value.length > 0 && !value.includes('@')) {
      throw new Error('Division Chair email must be valid if provided');
    }
    return true;
  }),
  body('approvers.dean.name').optional().trim(),
  body('approvers.dean.email').optional().trim().custom((value) => {
    if (value && value.length > 0 && !value.includes('@')) {
      throw new Error('Dean email must be valid if provided');
    }
    return true;
  }),
  body('approvers.seniorAssociateDean.name').optional().trim(),
  body('approvers.seniorAssociateDean.email').optional().trim().custom((value) => {
    if (value && value.length > 0 && !value.includes('@')) {
      throw new Error('Senior Associate Dean email must be valid if provided');
    }
    return true;
  }),
  
  // Faculty member fields  
  body('facultyMember.name').optional().trim().isLength({ min: 1 }).withMessage('Name cannot be empty if provided'),
  body('facultyMember.email').optional().trim().isEmail().withMessage('Valid email is required if provided'),
  body('facultyMember.title').optional().trim(),
  body('facultyMember.college').optional().trim(),
  body('facultyMember.department').optional().trim(),
  body('facultyMember.institution').optional().trim()
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
    
    // Admin-only fields
    if (req.body.fisEntered !== undefined) {
      updates.fisEntered = req.body.fisEntered;
      if (req.body.fisEntered) {
        updates.fisEntryDate = new Date();
      }
    }
    if (req.body.processingTimeWeeks !== undefined) {
      updates.processingTimeWeeks = parseFloat(req.body.processingTimeWeeks);
    }
    if (req.body.primaryAppointmentStartDate !== undefined) {
      updates.primaryAppointmentStartDate = req.body.primaryAppointmentStartDate;
    }
    if (req.body.primaryAppointmentEndDate !== undefined) {
      updates.primaryAppointmentEndDate = req.body.primaryAppointmentEndDate;
    }
    
    // Application fields
    if (req.body.status !== undefined) {
      updates.status = req.body.status;
    }
    if (req.body.currentApprover !== undefined) {
      updates.currentApprover = req.body.currentApprover;
    }
    
    // Question fields
    if (req.body.contributionsQuestion !== undefined) {
      updates.contributionsQuestion = req.body.contributionsQuestion;
    }
    if (req.body.alignmentQuestion !== undefined) {
      updates.alignmentQuestion = req.body.alignmentQuestion;
    }
    if (req.body.enhancementQuestion !== undefined) {
      updates.enhancementQuestion = req.body.enhancementQuestion;
    }
    
    // Faculty member fields - need to update the related faculty_members table
    if (req.body.facultyMember) {
      const facultyUpdates = {};
      if (req.body.facultyMember.name !== undefined) {
        facultyUpdates.name = req.body.facultyMember.name;
      }
      if (req.body.facultyMember.email !== undefined) {
        facultyUpdates.email = req.body.facultyMember.email;
      }
      if (req.body.facultyMember.title !== undefined) {
        facultyUpdates.title = req.body.facultyMember.title;
      }
      if (req.body.facultyMember.college !== undefined) {
        facultyUpdates.college = req.body.facultyMember.college;
      }
      if (req.body.facultyMember.department !== undefined) {
        facultyUpdates.department = req.body.facultyMember.department;
      }
      if (req.body.facultyMember.institution !== undefined) {
        facultyUpdates.institution = req.body.facultyMember.institution;
      }
      
      // Update faculty member if there are changes
      if (Object.keys(facultyUpdates).length > 0) {
        const db = require('../config/database');
        
        // Update the faculty_members table
        await db.run(
          'UPDATE faculty_members SET name = ?, email = ?, title = ?, college = ?, department = ?, institution = ? WHERE id = ?',
          [
            facultyUpdates.name || application.facultyName,
            facultyUpdates.email || application.facultyEmail,
            facultyUpdates.title || application.facultyTitle,
            facultyUpdates.college || application.facultyCollege,
            facultyUpdates.department || (application.facultyDepartment || null),
            facultyUpdates.institution || application.facultyInstitution,
            application.facultyMemberId
          ]
        );
        
        // Also update the embedded faculty data in the applications table
        const appFacultyUpdates = [];
        const appFacultyParams = [];
        
        if (facultyUpdates.name) {
          appFacultyUpdates.push('faculty_name = ?');
          appFacultyParams.push(facultyUpdates.name);
        }
        if (facultyUpdates.email) {
          appFacultyUpdates.push('faculty_email = ?');
          appFacultyParams.push(facultyUpdates.email);
        }
        if (facultyUpdates.title) {
          appFacultyUpdates.push('faculty_title = ?');
          appFacultyParams.push(facultyUpdates.title);
        }
        if (facultyUpdates.college) {
          appFacultyUpdates.push('faculty_college = ?');
          appFacultyParams.push(facultyUpdates.college);
        }
        if (facultyUpdates.department !== undefined) {
          appFacultyUpdates.push('faculty_department = ?');
          appFacultyParams.push(facultyUpdates.department);
        }
        if (facultyUpdates.institution) {
          appFacultyUpdates.push('faculty_institution = ?');
          appFacultyParams.push(facultyUpdates.institution);
        }
        
        if (appFacultyUpdates.length > 0) {
          appFacultyParams.push(req.params.id);
          const appFacultyQuery = `UPDATE applications SET ${appFacultyUpdates.join(', ')} WHERE id = ?`;
          await db.run(appFacultyQuery, appFacultyParams);
        }
      }
    }

    // Handle approver updates
    if (req.body.approvers) {
      const db = require('../config/database');
      const approverUpdates = [];
      const approverParams = [];
      
      // Department Chair
      if (req.body.approvers.departmentChair) {
        if (req.body.approvers.departmentChair.name !== undefined) {
          approverUpdates.push('department_chair_name = ?');
          approverParams.push(req.body.approvers.departmentChair.name);
        }
        if (req.body.approvers.departmentChair.email !== undefined) {
          approverUpdates.push('department_chair_email = ?');
          approverParams.push(req.body.approvers.departmentChair.email);
        }
      }
      
      // Division Chair
      if (req.body.approvers.divisionChair) {
        if (req.body.approvers.divisionChair.name !== undefined) {
          approverUpdates.push('division_chair_name = ?');
          approverParams.push(req.body.approvers.divisionChair.name);
        }
        if (req.body.approvers.divisionChair.email !== undefined) {
          approverUpdates.push('division_chair_email = ?');
          approverParams.push(req.body.approvers.divisionChair.email);
        }
      }
      
      // Dean
      if (req.body.approvers.dean) {
        if (req.body.approvers.dean.name !== undefined) {
          approverUpdates.push('dean_name = ?');
          approverParams.push(req.body.approvers.dean.name);
        }
        if (req.body.approvers.dean.email !== undefined) {
          approverUpdates.push('dean_email = ?');
          approverParams.push(req.body.approvers.dean.email);
        }
      }
      
      // Senior Associate Dean
      if (req.body.approvers.seniorAssociateDean) {
        if (req.body.approvers.seniorAssociateDean.name !== undefined) {
          approverUpdates.push('senior_associate_dean_name = ?');
          approverParams.push(req.body.approvers.seniorAssociateDean.name);
        }
        if (req.body.approvers.seniorAssociateDean.email !== undefined) {
          approverUpdates.push('senior_associate_dean_email = ?');
          approverParams.push(req.body.approvers.seniorAssociateDean.email);
        }
      }
      
      // Update approvers if there are changes
      if (approverUpdates.length > 0) {
        approverUpdates.push('updated_at = ?');
        approverParams.push(new Date());
        approverParams.push(req.params.id);
        
        const approverQuery = `UPDATE applications SET ${approverUpdates.join(', ')} WHERE id = ?`;
        await db.run(approverQuery, approverParams);
      }
    }

    await application.update(updates);

    // Reload the application with updated faculty member data
    const updatedApplication = await Application.findById(req.params.id);

    res.json({
      data: updatedApplication.toJSON(),
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
          newStatus = 'ccc_associate_dean_review';
          break;
        case 'ccc_associate_dean_review':
          newStatus = 'awaiting_primary_approval';
          break;
        case 'awaiting_primary_approval':
          newStatus = 'fis_entry_pending';
          break;
        default:
          newStatus = 'fis_entry_pending';
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

// GET /api/applications/:id/cv - Download or view CV file from database BLOB
router.get('/:id/cv', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (!application.cvFileData) {
      return res.status(404).json({ error: 'CV file not found for this application' });
    }

    const fileName = application.cvFileName || `CV-${application.id}.pdf`;
    const inline = req.query.inline === 'true'; // Check if we want inline viewing
    
    // Set appropriate headers
    res.setHeader('Content-Type', application.cvMimeType || getContentTypeFromFileName(fileName));
    res.setHeader('Content-Length', application.cvFileSize || application.cvFileData.length);
    
    if (inline) {
      // For inline viewing (preview)
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      // Note: CSP headers are set globally in server.js for iframe embedding
    } else {
      // For download
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }
    
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Accept-Ranges', 'bytes');

    // Send the BLOB data directly
    res.send(application.cvFileData);

  } catch (error) {
    console.error('Error serving CV:', error);
    res.status(500).json({ error: 'Failed to serve CV file' });
  }
});

// POST /api/applications/:id/advance-to-associate-dean - Move application from CCC Review to CCC Associate Dean Review
router.post('/:id/advance-to-associate-dean', [
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

    // Ensure application is in correct status
    if (application.status !== 'ccc_review') {
      return res.status(400).json({ 
        error: 'Application must be in CCC Review status to advance to CCC Associate Dean Review',
        currentStatus: application.status
      });
    }

    const notes = req.body.notes || 'Advanced to CCC Associate Dean Review by CCC Staff';
    
    // Update application status
    await application.updateStatus('ccc_associate_dean_review', 'CCC Staff', notes);

    // Send notification to CCC Associate Dean
    try {
      const notificationService = new NotificationService();
      await notificationService.sendStatusChangeNotification(application, 'ccc_associate_dean_review');
    } catch (error) {
      console.error('Failed to send CCC Associate Dean notification:', error.message);
      // Don't fail the status update if notification fails
    }

    res.json({
      success: true,
      message: 'Application advanced to CCC Associate Dean Review successfully',
      application: application.toJSON()
    });

  } catch (error) {
    console.error('Error advancing application to CCC Associate Dean Review:', error);
    res.status(500).json({ error: 'Failed to advance application' });
  }
});

// POST /api/applications/validate-token - Validate approval token
router.post('/validate-token', [
  body('token').notEmpty().withMessage('Token is required'),
  body('applicationId').notEmpty().withMessage('Application ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        valid: false,
        used: false,
        message: 'Invalid request parameters',
        details: errors.array() 
      });
    }

    const { token, applicationId } = req.body;

    // Validate the token
    const tokenData = await ApprovalTokenService.validateToken(token);
    
    // Check if token is for the correct application
    if (tokenData.application_id !== applicationId) {
      return res.json({
        valid: false,
        used: false,
        message: 'Token is not valid for this application'
      });
    }

    // Check if already used
    if (tokenData.used) {
      return res.json({
        valid: true,
        used: true,
        message: 'This approval link has already been used'
      });
    }

    // Token is valid and unused
    res.json({
      valid: true,
      used: false,
      message: 'Token is valid',
      approverRole: tokenData.approver_role,
      approverName: tokenData.approver_name
    });

  } catch (error) {
    console.error('Token validation error:', error);
    res.json({
      valid: false,
      used: false,
      message: error.message || 'Invalid or expired token'
    });
  }
});

// PATCH /api/applications/:id/approve - Process approval with token
router.patch('/:id/approve', [
  body('approverEmail').isEmail().withMessage('Valid approver email is required'),
  body('token').notEmpty().withMessage('Approval token is required'),
  body('action').isIn(['approve', 'deny']).withMessage('Action must be approve or deny'),
  body('signature').notEmpty().withMessage('Digital signature is required'),
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

    const { approverEmail, token, action, signature, notes } = req.body;
    const applicationId = req.params.id;

    // Validate the token
    const tokenData = await ApprovalTokenService.validateToken(token);
    
    // Verify token matches the request
    if (tokenData.application_id !== applicationId || tokenData.approver_email !== approverEmail) {
      return res.status(403).json({ error: 'Token validation failed' });
    }

    // Get the application
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Mark token as used
    await ApprovalTokenService.markTokenAsUsed(token);

    let nextStatus = null;

    // Process the approval based on action
    if (action === 'approve') {
      // Update application status and add to status history
      await application.addStatusHistory(
        application.status, 
        `${tokenData.approver_name} (${tokenData.approver_role})`,
        notes,
        token
      );
      
      // Move to next status based on current workflow
      nextStatus = await getNextApprovalStatus(application, tokenData.approver_role);
      if (nextStatus) {
        await application.updateStatus(nextStatus);
      }

      // Send notifications for next step if approved and nextStatus exists
      if (nextStatus) {
        try {
          const notificationService = new NotificationService();
          await notificationService.sendStatusChangeNotification(application, nextStatus, tokenData.approver_role);
        } catch (notificationError) {
          console.error('Failed to send status change notification:', notificationError.message);
          // Don't fail the approval if notification fails
        }
      }
    } else {
      // Deny application
      await application.updateStatus('rejected');
      await application.addStatusHistory(
        'rejected', 
        `${tokenData.approver_name} (${tokenData.approver_role})`,
        notes || 'Application denied',
        token
      );
      
      // Send rejection notification to applicant
      try {
        console.log(`🔥 REJECTION: Attempting to send rejection notification for application ${application.id} to ${application.facultyEmail}`);
        const notificationService = new NotificationService();
        const rejectedBy = `${tokenData.approver_name} (${tokenData.approver_role})`;
        await notificationService.sendStatusChangeNotification(application, 'rejected', null, rejectedBy);
        console.log(`✅ REJECTION: Rejection notification sent successfully for application ${application.id}`);
      } catch (notificationError) {
        console.error('❌ REJECTION: Failed to send rejection notification:', notificationError.message);
        console.error('❌ REJECTION: Full error:', notificationError);
        // Don't fail the rejection if notification fails
      }
    }

    res.json({
      success: true,
      message: `Application ${action}d successfully`,
      application: application.toJSON()
    });

  } catch (error) {
    console.error('Approval processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process approval',
      message: error.message 
    });
  }
});

// POST /api/applications/:id/resend-notification - Resend notification to current approver
router.post('/:id/resend-notification', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Use NotificationService to resend appropriate notification for current status
    const NotificationService = require('../services/NotificationService');
    const notificationService = new NotificationService();
    
    // Resend the notification for the current status
    switch (application.status) {
      case 'ccc_review':
        // Resend CCC Review notification (initial submission)
        await notificationService.sendApplicationSubmittedNotification(application);
        break;
        
      case 'ccc_associate_dean_review':
      case 'awaiting_primary_approval':  
      case 'fis_entry_pending':
        // Resend notification for current status
        await notificationService.sendStatusChangeNotification(application, application.status);
        break;
        
      default:
        return res.status(400).json({ 
          error: 'Cannot resend notification for applications in this status' 
        });
    }

    res.json({ message: 'Notification resent successfully' });
  } catch (error) {
    console.error('Error resending notification:', error);
    res.status(500).json({ error: 'Failed to resend notification' });
  }
});

// Helper function to get approval hierarchy for an application
function getApprovalHierarchy(application) {
  // Get college configuration to determine required approvers and their order
  const collegeRequirements = getCollegeRequirements(application.facultyCollege);
  const requiredApprovers = collegeRequirements.requiredApprovers || [];
  
  const hierarchy = [];
  
  // Build hierarchy based on required approvers order
  for (const approverType of requiredApprovers) {
    switch (approverType) {
      case 'departmentChair':
        if (application.departmentChairName && application.departmentChairEmail) {
          hierarchy.push({
            role: 'department_chair',
            name: application.departmentChairName,
            email: application.departmentChairEmail
          });
        }
        break;
      
      case 'associateDean':
        if (application.seniorAssociateDeanName && application.seniorAssociateDeanEmail) {
          hierarchy.push({
            role: 'senior_associate_dean',
            name: application.seniorAssociateDeanName,
            email: application.seniorAssociateDeanEmail
          });
        }
        break;
      
      case 'dean':
        if (application.deanName && application.deanEmail) {
          hierarchy.push({
            role: 'dean',
            name: application.deanName,
            email: application.deanEmail
          });
        }
        break;
      
      case 'viceDean':
        if (application.deanName && application.deanEmail) {
          hierarchy.push({
            role: 'viceDean', // Use viceDean role for proper workflow handling
            name: application.deanName,
            email: application.deanEmail
          });
        }
        break;
    }
  }
  
  // Also add division chair if it exists (alternative to department chair)
  if (application.divisionChairName && application.divisionChairEmail && !hierarchy.some(h => h.role === 'department_chair')) {
    hierarchy.unshift({
      role: 'division_chair',
      name: application.divisionChairName,
      email: application.divisionChairEmail
    });
  }
  
  return hierarchy;
}

// Helper function to get completed approvals for an application
async function getCompletedApprovals(applicationId) {
  try {
    const db = require('../config/database');
    const approvals = await db.all(
      'SELECT approver_role, approver_name, used_at FROM approval_tokens WHERE application_id = ? AND used = 1',
      [applicationId]
    );
    return approvals || [];
  } catch (error) {
    console.error('❌ Failed to get completed approvals:', error.message);
    return [];
  }
}

// Helper function to determine next approver in sequence
async function getNextApproverInSequence(application) {
  const hierarchy = getApprovalHierarchy(application);
  const completedApprovals = await getCompletedApprovals(application.id);
  const completedRoles = completedApprovals.map(approval => approval.approver_role);
  
  // Find the first approver in hierarchy who hasn't completed their approval
  for (const approver of hierarchy) {
    if (!completedRoles.includes(approver.role)) {
      return approver;
    }
  }
  
  return null; // All approvers have completed their approvals
}

// Helper function to determine next approval status
async function getNextApprovalStatus(application, currentApproverRole) {
  switch (currentApproverRole) {
    case 'ccc_associate_dean':
      // After CCC Associate Dean, move to primary approval with first approver
      const nextApprover = await getNextApproverInSequence(application);
      return nextApprover ? 'awaiting_primary_approval' : 'fis_entry_pending';
      
    case 'department_chair':
    case 'division_chair':
    case 'senior_associate_dean':
    case 'dean':
    case 'viceDean':
      // Check if there are more approvers in the sequence
      const remainingApprover = await getNextApproverInSequence(application);
      return remainingApprover ? 'awaiting_primary_approval' : 'fis_entry_pending';
      
    default:
      return null;
  }
}

// Helper function to determine content type based on file extension
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

// Helper function to determine content type based on file name (for BLOB storage)
function getContentTypeFromFileName(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

module.exports = router;