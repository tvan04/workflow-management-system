const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const db = require('../config/database');

class Application {
  constructor(data = {}) {
    this.id = data.id || `APP-${moment().format('YYYY')}-${uuidv4().substring(0, 8).toUpperCase()}`;
    this.facultyMemberId = data.facultyMemberId;
    this.status = data.status || 'ccc_review';
    this.appointmentType = data.appointmentType;
    this.effectiveDate = data.effectiveDate;
    this.duration = data.duration;
    this.rationale = data.rationale;
    this.cvFilePath = data.cvFilePath;
    this.cvFileName = data.cvFileName;
    
    // Approval chain
    this.departmentChairName = data.departmentChairName;
    this.departmentChairEmail = data.departmentChairEmail;
    this.divisionChairName = data.divisionChairName;
    this.divisionChairEmail = data.divisionChairEmail;
    this.deanName = data.deanName;
    this.deanEmail = data.deanEmail;
    this.seniorAssociateDeanName = data.seniorAssociateDeanName;
    this.seniorAssociateDeanEmail = data.seniorAssociateDeanEmail;
    this.hasDepartments = data.hasDepartments !== undefined ? data.hasDepartments : true;
    
    // Tracking fields
    this.submittedAt = data.submittedAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.currentApprover = data.currentApprover;
    this.fisEntered = data.fisEntered || false;
    this.fisEntryDate = data.fisEntryDate;
    this.processingTimeWeeks = data.processingTimeWeeks;
    this.primaryAppointmentEndDate = data.primaryAppointmentEndDate;
  }

  async save() {
    const query = `
      INSERT INTO applications (
        id, faculty_member_id, status, appointment_type, effective_date, duration,
        rationale, cv_file_path, cv_file_name, department_chair_name, department_chair_email,
        division_chair_name, division_chair_email, dean_name, dean_email,
        senior_associate_dean_name, senior_associate_dean_email, has_departments,
        submitted_at, updated_at, current_approver, fis_entered, fis_entry_date,
        processing_time_weeks, primary_appointment_end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      this.id, this.facultyMemberId, this.status, this.appointmentType, this.effectiveDate,
      this.duration, this.rationale, this.cvFilePath, this.cvFileName,
      this.departmentChairName, this.departmentChairEmail, this.divisionChairName,
      this.divisionChairEmail, this.deanName, this.deanEmail, this.seniorAssociateDeanName,
      this.seniorAssociateDeanEmail, this.hasDepartments, this.submittedAt, this.updatedAt,
      this.currentApprover, this.fisEntered, this.fisEntryDate, this.processingTimeWeeks,
      this.primaryAppointmentEndDate
    ];

    await db.run(query, params);
    
    // Add initial status to history
    await this.addStatusHistory('ccc_review', null, 'Application submitted and moved to CCC Review');
    
    return this;
  }

  async update(updates) {
    const allowedFields = [
      'status', 'currentApprover', 'fisEntered', 'fisEntryDate', 'processingTimeWeeks',
      'primaryAppointmentEndDate'
    ];

    const updateFields = [];
    const params = [];

    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field)) {
        updateFields.push(`${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`);
        params.push(updates[field]);
        this[field] = updates[field];
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = ?');
    params.push(new Date());
    this.updatedAt = new Date();

    // Add the ID for the WHERE clause
    params.push(this.id);

    const query = `
      UPDATE applications 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await db.run(query, params);
    return this;
  }

  async updateStatus(newStatus, approver = null, notes = null) {
    await this.update({ 
      status: newStatus, 
      currentApprover: this.getNextApprover(newStatus)
    });
    
    await this.addStatusHistory(newStatus, approver, notes);
    return this;
  }

  async addStatusHistory(status, approver = null, notes = null) {
    const query = `
      INSERT INTO status_history (application_id, status, approver, notes)
      VALUES (?, ?, ?, ?)
    `;
    await db.run(query, [this.id, status, approver, notes]);
  }

  getNextApprover(status) {
    switch (status) {
      case 'submitted':
        return 'CCC Faculty';
      case 'ccc_review':
        return 'CCC Faculty';
      case 'awaiting_primary_approval':
        if (this.hasDepartments && this.departmentChairName) {
          return `${this.departmentChairName} (Department Chair)`;
        }
        return `${this.deanName} (Dean)`;
      case 'fis_entry_pending':
        return 'CCC Staff (FIS Entry)';
      case 'completed':
      case 'rejected':
        return null;
      default:
        return null;
    }
  }

  async getStatusHistory() {
    const query = `
      SELECT * FROM status_history 
      WHERE application_id = ? 
      ORDER BY timestamp ASC
    `;
    return await db.all(query, [this.id]);
  }

  calculateProcessingTime() {
    if (this.status === 'completed' || this.status === 'rejected') {
      const submitted = moment(this.submittedAt);
      const completed = moment(this.updatedAt);
      return completed.diff(submitted, 'weeks', true);
    }
    return null;
  }

  getDaysSinceUpdate() {
    return moment().diff(moment(this.updatedAt), 'days');
  }

  isStalled(thresholdDays = 7) {
    return this.getDaysSinceUpdate() > thresholdDays;
  }

  toJSON() {
    return {
      id: this.id,
      facultyMember: this.facultyMember,
      approvalChain: {
        departmentChair: this.departmentChairName ? {
          name: this.departmentChairName,
          email: this.departmentChairEmail
        } : null,
        divisionChair: this.divisionChairName ? {
          name: this.divisionChairName,
          email: this.divisionChairEmail
        } : null,
        dean: {
          name: this.deanName,
          email: this.deanEmail
        },
        seniorAssociateDean: this.seniorAssociateDeanName ? {
          name: this.seniorAssociateDeanName,
          email: this.seniorAssociateDeanEmail
        } : null,
        hasDepartments: this.hasDepartments
      },
      status: this.status,
      appointmentType: this.appointmentType,
      effectiveDate: this.effectiveDate,
      duration: this.duration,
      submittedAt: this.submittedAt,
      updatedAt: this.updatedAt,
      rationale: this.rationale,
      cvFile: this.cvFileName,
      currentApprover: this.currentApprover,
      fisEntered: this.fisEntered,
      fisEntryDate: this.fisEntryDate,
      processingTimeWeeks: this.processingTimeWeeks,
      primaryAppointmentEndDate: this.primaryAppointmentEndDate,
      statusHistory: this.statusHistory || []
    };
  }

  // Static methods
  static async findById(id) {
    const query = `
      SELECT a.*, f.name as faculty_name, f.email as faculty_email, 
             f.title as faculty_title, f.department as faculty_department,
             f.college as faculty_college, f.institution as faculty_institution
      FROM applications a
      JOIN faculty_members f ON a.faculty_member_id = f.id
      WHERE a.id = ?
    `;
    
    const row = await db.get(query, [id]);
    if (!row) return null;

    const app = new Application(row);
    app.facultyMember = {
      id: row.faculty_member_id,
      name: row.faculty_name,
      email: row.faculty_email,
      title: row.faculty_title,
      department: row.faculty_department,
      college: row.faculty_college,
      institution: row.faculty_institution
    };
    
    // Load status history
    app.statusHistory = await app.getStatusHistory();
    
    return app;
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT a.*, f.name as faculty_name, f.email as faculty_email, 
             f.title as faculty_title, f.department as faculty_department,
             f.college as faculty_college, f.institution as faculty_institution
      FROM applications a
      JOIN faculty_members f ON a.faculty_member_id = f.id
    `;
    
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('a.status = ?');
      params.push(filters.status);
    }

    if (filters.college) {
      conditions.push('f.college = ?');
      params.push(filters.college);
    }

    if (filters.institution) {
      conditions.push('f.institution = ?');
      params.push(filters.institution);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY a.submitted_at DESC`;

    const rows = await db.all(query, params);
    
    return rows.map(row => {
      const app = new Application(row);
      app.facultyMember = {
        id: row.faculty_member_id,
        name: row.faculty_name,
        email: row.faculty_email,
        title: row.faculty_title,
        department: row.faculty_department,
        college: row.faculty_college,
        institution: row.faculty_institution
      };
      return app;
    });
  }

  static async search(query) {
    const searchQuery = `
      SELECT DISTINCT a.*, f.name as faculty_name, f.email as faculty_email, 
             f.title as faculty_title, f.department as faculty_department,
             f.college as faculty_college, f.institution as faculty_institution
      FROM applications a
      JOIN faculty_members f ON a.faculty_member_id = f.id
      WHERE f.name LIKE ? OR f.email LIKE ? OR a.id LIKE ?
      ORDER BY a.submitted_at DESC
    `;
    
    const searchTerm = `%${query}%`;
    const rows = await db.all(searchQuery, [searchTerm, searchTerm, searchTerm]);
    
    const applications = [];
    for (const row of rows) {
      const app = new Application(row);
      app.facultyMember = {
        id: row.faculty_member_id,
        name: row.faculty_name,
        email: row.faculty_email,
        title: row.faculty_title,
        department: row.faculty_department,
        college: row.faculty_college,
        institution: row.faculty_institution
      };
      
      // Load status history for each application
      app.statusHistory = await app.getStatusHistory();
      
      applications.push(app);
    }
    
    return applications;
  }

  static async getMetrics() {
    // Get total applications count
    const totalResult = await db.get('SELECT COUNT(*) as total FROM applications');
    const totalApplications = totalResult.total;

    // Get applications by status
    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM applications 
      GROUP BY status
    `;
    const statusRows = await db.all(statusQuery);
    const applicationsByStatus = {
      'submitted': 0,
      'ccc_review': 0,
      'awaiting_primary_approval': 0,
      'fis_entry_pending': 0,
      'completed': 0,
      'rejected': 0
    };
    
    statusRows.forEach(row => {
      applicationsByStatus[row.status] = row.count;
    });

    // Get average processing time for completed applications
    const avgTimeQuery = `
      SELECT AVG(processing_time_weeks) as avg_time 
      FROM applications 
      WHERE status IN ('completed', 'rejected') AND processing_time_weeks IS NOT NULL
    `;
    const avgTimeResult = await db.get(avgTimeQuery);
    const averageProcessingTime = avgTimeResult.avg_time || 0;

    // Get stalled applications (more than 7 days since update)
    const stalledQuery = `
      SELECT a.*, f.name as faculty_name, f.email as faculty_email, 
             f.title as faculty_title, f.department as faculty_department,
             f.college as faculty_college, f.institution as faculty_institution
      FROM applications a
      JOIN faculty_members f ON a.faculty_member_id = f.id
      WHERE a.status NOT IN ('completed', 'rejected') 
      AND datetime(a.updated_at) < datetime('now', '-7 days')
      ORDER BY a.updated_at ASC
    `;
    const stalledRows = await db.all(stalledQuery);
    
    const stalledApplications = stalledRows.map(row => {
      const app = new Application(row);
      app.facultyMember = {
        id: row.faculty_member_id,
        name: row.faculty_name,
        email: row.faculty_email,
        title: row.faculty_title,
        department: row.faculty_department,
        college: row.faculty_college,
        institution: row.faculty_institution
      };
      return app;
    });

    // Get recent activity
    const recentActivityQuery = `
      SELECT sh.*, a.id as application_id
      FROM status_history sh
      JOIN applications a ON sh.application_id = a.id
      ORDER BY sh.timestamp DESC
      LIMIT 10
    `;
    const recentActivity = await db.all(recentActivityQuery);

    return {
      totalApplications,
      applicationsByStatus,
      averageProcessingTime: Math.round(averageProcessingTime * 10) / 10,
      stalledApplications,
      recentActivity
    };
  }
}

module.exports = Application;