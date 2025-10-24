const express = require('express');
const { body, validationResult } = require('express-validator');

const College = require('../models/College');
const Department = require('../models/Department');

const router = express.Router();

// Validation middleware
const validateCollege = [
  body('name').trim().notEmpty().withMessage('College name is required'),
  body('hasDepartments').isBoolean().withMessage('Has departments must be boolean'),
  body('deanName').trim().notEmpty().withMessage('Dean name is required'),
  body('deanEmail').isEmail().withMessage('Valid dean email is required'),
  body('deanTitle').optional().trim()
];

const validateDepartment = [
  body('name').trim().notEmpty().withMessage('Department name is required'),
  body('chairName').trim().notEmpty().withMessage('Chair name is required'),
  body('chairEmail').isEmail().withMessage('Valid chair email is required'),
  body('chairTitle').optional().trim()
];

// GET /api/colleges - Get all colleges
router.get('/', async (req, res) => {
  try {
    const colleges = await College.findAll();
    
    // Include departments for each college
    const collegesWithDepartments = await Promise.all(
      colleges.map(async (college) => {
        const collegeData = college.toJSON();
        if (college.hasDepartments) {
          const departments = await college.getDepartments();
          collegeData.departments = departments.map(dept => dept.toJSON());
        }
        return collegeData;
      })
    );
    
    res.json({
      data: collegesWithDepartments,
      message: `Found ${colleges.length} colleges`
    });
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
});

// GET /api/colleges/:id - Get college by ID
router.get('/:id', async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    
    if (!college) {
      return res.status(404).json({ error: 'College not found' });
    }

    const collegeData = college.toJSON();
    if (college.hasDepartments) {
      const departments = await college.getDepartments();
      collegeData.departments = departments.map(dept => dept.toJSON());
    }
    
    res.json({
      data: collegeData
    });
  } catch (error) {
    console.error('Error fetching college:', error);
    res.status(500).json({ error: 'Failed to fetch college' });
  }
});

// POST /api/colleges - Create new college
router.post('/', validateCollege, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Check if college with same name already exists
    const existingCollege = await College.findByName(req.body.name);
    if (existingCollege) {
      return res.status(409).json({ error: 'College with this name already exists' });
    }

    const collegeData = {
      name: req.body.name,
      hasDepartments: req.body.hasDepartments,
      deanName: req.body.deanName,
      deanEmail: req.body.deanEmail,
      deanTitle: req.body.deanTitle || 'Dean',
      seniorAssociateDeanName: req.body.seniorAssociateDeanName,
      seniorAssociateDeanEmail: req.body.seniorAssociateDeanEmail
    };

    const college = new College(collegeData);
    await college.save();
    
    res.status(201).json({
      data: college.toJSON(),
      message: 'College created successfully'
    });
  } catch (error) {
    console.error('Error creating college:', error);
    res.status(500).json({ error: 'Failed to create college' });
  }
});

// PUT /api/colleges/:id - Update college
router.put('/:id', validateCollege, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const college = await College.findById(req.params.id);
    if (!college) {
      return res.status(404).json({ error: 'College not found' });
    }

    // Check if another college with same name exists
    if (req.body.name !== college.name) {
      const existingCollege = await College.findByName(req.body.name);
      if (existingCollege) {
        return res.status(409).json({ error: 'College with this name already exists' });
      }
    }

    const updates = {
      name: req.body.name,
      hasDepartments: req.body.hasDepartments,
      deanName: req.body.deanName,
      deanEmail: req.body.deanEmail,
      deanTitle: req.body.deanTitle || 'Dean',
      seniorAssociateDeanName: req.body.seniorAssociateDeanName,
      seniorAssociateDeanEmail: req.body.seniorAssociateDeanEmail
    };

    await college.update(updates);
    
    res.json({
      data: college.toJSON(),
      message: 'College updated successfully'
    });
  } catch (error) {
    console.error('Error updating college:', error);
    res.status(500).json({ error: 'Failed to update college' });
  }
});

// DELETE /api/colleges/:id - Delete college
router.delete('/:id', async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) {
      return res.status(404).json({ error: 'College not found' });
    }

    await college.delete();
    
    res.json({
      data: { deleted: true },
      message: 'College deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting college:', error);
    res.status(500).json({ error: 'Failed to delete college' });
  }
});

// POST /api/colleges/:id/departments - Add department to college
router.post('/:id/departments', validateDepartment, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const college = await College.findById(req.params.id);
    if (!college) {
      return res.status(404).json({ error: 'College not found' });
    }

    if (!college.hasDepartments) {
      return res.status(400).json({ error: 'This college does not have departments' });
    }

    const departmentData = {
      collegeId: college.id,
      name: req.body.name,
      chairName: req.body.chairName,
      chairEmail: req.body.chairEmail,
      chairTitle: req.body.chairTitle || 'Department Chair',
      divisionChairName: req.body.divisionChairName,
      divisionChairEmail: req.body.divisionChairEmail
    };

    const department = new Department(departmentData);
    await department.save();
    
    res.status(201).json({
      data: department.toJSON(),
      message: 'Department created successfully'
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// GET /api/colleges/:id/departments - Get departments for college
router.get('/:id/departments', async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) {
      return res.status(404).json({ error: 'College not found' });
    }

    const departments = await college.getDepartments();
    
    res.json({
      data: departments.map(dept => dept.toJSON()),
      message: `Found ${departments.length} departments`
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// PUT /api/colleges/:collegeId/departments/:departmentId - Update department
router.put('/:collegeId/departments/:departmentId', validateDepartment, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const department = await Department.findById(req.params.departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (department.collegeId !== req.params.collegeId) {
      return res.status(400).json({ error: 'Department does not belong to this college' });
    }

    const updates = {
      name: req.body.name,
      chairName: req.body.chairName,
      chairEmail: req.body.chairEmail,
      chairTitle: req.body.chairTitle || 'Department Chair',
      divisionChairName: req.body.divisionChairName,
      divisionChairEmail: req.body.divisionChairEmail
    };

    await department.update(updates);
    
    res.json({
      data: department.toJSON(),
      message: 'Department updated successfully'
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// DELETE /api/colleges/:collegeId/departments/:departmentId - Delete department
router.delete('/:collegeId/departments/:departmentId', async (req, res) => {
  try {
    const department = await Department.findById(req.params.departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (department.collegeId !== req.params.collegeId) {
      return res.status(400).json({ error: 'Department does not belong to this college' });
    }

    await department.delete();
    
    res.json({
      data: { deleted: true },
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

module.exports = router;