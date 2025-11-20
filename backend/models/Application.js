const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const db = require('../config/database');

class Application {
  constructor(data = {}) {
    this.id = data.id || `APP-${moment().format('YYYY')}-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    // Faculty information (embedded directly)
    this.facultyName = data.facultyName || data.faculty_name;
    this.facultyEmail = data.facultyEmail || data.faculty_email;
    this.facultyTitle = data.facultyTitle || data.faculty_title;
    this.facultyDepartment = data.facultyDepartment || data.faculty_department;
    this.facultyCollege = data.facultyCollege || data.faculty_college;
    this.facultyInstitution = data.facultyInstitution || data.faculty_institution;
    
    this.status = data.status || 'ccc_review';
    this.appointmentType = data.appointmentType || data.appointment_type;
    this.effectiveDate = data.effectiveDate || data.effective_date;
    this.duration = data.duration;
    this.rationale = data.rationale;
    this.contributionsQuestion = data.contributionsQuestion || data.contributions_question;
    this.alignmentQuestion = data.alignmentQuestion || data.alignment_question;
    this.enhancementQuestion = data.enhancementQuestion || data.enhancement_question;
    this.cvFilePath = data.cvFilePath || data.cv_file_path;
    this.cvFileName = data.cvFileName || data.cv_file_name;
    this.cvFileData = data.cvFileData || data.cv_file_data;
    this.cvFileSize = data.cvFileSize || data.cv_file_size;
    this.cvMimeType = data.cvMimeType || data.cv_mime_type;
    
    // Approval chain - support both camelCase and snake_case, default to empty string
    this.departmentChairName = data.departmentChairName || data.department_chair_name || '';
    this.departmentChairEmail = data.departmentChairEmail || data.department_chair_email || '';
    this.divisionChairName = data.divisionChairName || data.division_chair_name || '';
    this.divisionChairEmail = data.divisionChairEmail || data.division_chair_email || '';
    this.deanName = data.deanName || data.dean_name || '';
    this.deanEmail = data.deanEmail || data.dean_email || '';
    this.seniorAssociateDeanName = data.seniorAssociateDeanName || data.senior_associate_dean_name || '';
    this.seniorAssociateDeanEmail = data.seniorAssociateDeanEmail || data.senior_associate_dean_email || '';
    this.hasDepartments = data.hasDepartments !== undefined ? data.hasDepartments : (data.has_departments !== undefined ? data.has_departments : true);
    
    // Tracking fields - support both camelCase and snake_case
    this.submittedAt = data.submittedAt || data.submitted_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
    this.currentApprover = data.currentApprover || data.current_approver;
    this.fisEntered = data.fisEntered || data.fis_entered || false;
    this.fisEntryDate = data.fisEntryDate || data.fis_entry_date;
    this.processingTimeWeeks = data.processingTimeWeeks || data.processing_time_weeks;
    this.primaryAppointmentStartDate = data.primaryAppointmentStartDate || data.primary_appointment_start_date;
    this.primaryAppointmentEndDate = data.primaryAppointmentEndDate || data.primary_appointment_end_date;
  }

  async save() {
    const query = `
      INSERT INTO applications (
        id, faculty_name, faculty_email, faculty_title, faculty_department, faculty_college, faculty_institution,
        status, appointment_type, effective_date, duration,
        rationale, contributions_question, alignment_question, enhancement_question, 
        cv_file_path, cv_file_name, cv_file_data, cv_file_size, cv_mime_type,
        department_chair_name, department_chair_email,
        division_chair_name, division_chair_email, dean_name, dean_email,
        senior_associate_dean_name, senior_associate_dean_email, has_departments,
        submitted_at, updated_at, current_approver, fis_entered, fis_entry_date,
        processing_time_weeks, primary_appointment_start_date, primary_appointment_end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      this.id, this.facultyName, this.facultyEmail, this.facultyTitle, this.facultyDepartment, this.facultyCollege, this.facultyInstitution,
      this.status, this.appointmentType, this.effectiveDate,
      this.duration, this.rationale, this.contributionsQuestion, this.alignmentQuestion, this.enhancementQuestion, 
      this.cvFilePath, this.cvFileName, this.cvFileData, this.cvFileSize, this.cvMimeType,
      this.departmentChairName, this.departmentChairEmail, this.divisionChairName,
      this.divisionChairEmail, this.deanName, this.deanEmail, this.seniorAssociateDeanName,
      this.seniorAssociateDeanEmail, this.hasDepartments, this.submittedAt, this.updatedAt,
      this.currentApprover, this.fisEntered, this.fisEntryDate, this.processingTimeWeeks,
      this.primaryAppointmentStartDate, this.primaryAppointmentEndDate
    ];

    await db.run(query, params);
    
    // Add initial status to history
    await this.addStatusHistory('ccc_review', null, 'Application submitted and moved to CCC Review');
    
    return this;
  }

  async update(updates) {
    const allowedFields = [
      'status', 'currentApprover', 'fisEntered', 'fisEntryDate', 'processingTimeWeeks',
      'primaryAppointmentStartDate', 'primaryAppointmentEndDate'
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

  async addStatusHistory(status, approver = null, notes = null, approverToken = null) {
    const query = `
      INSERT INTO status_history (application_id, status, approver, notes, approver_token)
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.run(query, [this.id, status, approver, notes, approverToken]);
  }

  getNextApprover(status) {
    switch (status) {
      case 'submitted':
        return 'CCC Faculty';
      case 'ccc_review':
        return 'CCC Faculty';
      case 'ccc_associate_dean_review':
        return 'CCC Associate Dean';
      case 'awaiting_primary_approval':
        if (this.hasDepartments && this.departmentChairName) {
          return `${this.departmentChairName} (Department Chair)`;
        }
        // For schools without departments, check Associate Dean first, then Dean
        if (this.seniorAssociateDeanName) {
          return `${this.seniorAssociateDeanName} (Associate Dean)`;
        }
        if (this.deanName) {
          return `${this.deanName} (Dean)`;
        }
        return null;
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
    try {
      const query = `
        SELECT * FROM status_history 
        WHERE application_id = ? 
        ORDER BY timestamp ASC
      `;
      return await db.all(query, [this.id]);
    } catch (error) {
      console.error(`Error loading status history for application ${this.id}:`, error);
      return []; // Return empty array if status history fails to load
    }
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
      facultyMember: {
        id: this.id, // Use application ID as faculty ID for compatibility
        name: this.facultyName,
        email: this.facultyEmail,
        title: this.facultyTitle,
        department: this.facultyDepartment,
        college: this.facultyCollege,
        institution: this.facultyInstitution
      },
      approvalChain: {
        departmentChair: this.departmentChairName ? {
          name: this.departmentChairName,
          email: this.departmentChairEmail
        } : null,
        divisionChair: this.divisionChairName ? {
          name: this.divisionChairName,
          email: this.divisionChairEmail
        } : null,
        dean: this.deanName ? {
          name: this.deanName,
          email: this.deanEmail
        } : null,
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
      contributionsQuestion: this.contributionsQuestion,
      alignmentQuestion: this.alignmentQuestion,
      enhancementQuestion: this.enhancementQuestion,
      cvFile: this.cvFileName,
      cvFileName: this.cvFileName,
      currentApprover: this.currentApprover,
      fisEntered: this.fisEntered,
      fisEntryDate: this.fisEntryDate,
      processingTimeWeeks: this.processingTimeWeeks,
      primaryAppointmentStartDate: this.primaryAppointmentStartDate || null,
      primaryAppointmentEndDate: this.primaryAppointmentEndDate || null,
      statusHistory: this.statusHistory || [],
      // Individual approver fields for admin interface
      departmentChairName: this.departmentChairName,
      departmentChairEmail: this.departmentChairEmail,
      divisionChairName: this.divisionChairName,
      divisionChairEmail: this.divisionChairEmail,
      deanName: this.deanName,
      deanEmail: this.deanEmail,
      seniorAssociateDeanName: this.seniorAssociateDeanName,
      seniorAssociateDeanEmail: this.seniorAssociateDeanEmail
    };
  }

  // Static methods
  static async findById(id) {
    const query = `SELECT * FROM applications WHERE id = ?`;
    
    const row = await db.get(query, [id]);
    if (!row) return null;

    const app = new Application(row);
    
    // Load status history
    try {
      app.statusHistory = await app.getStatusHistory();
    } catch (error) {
      console.error(`Error loading status history for application ${app.id}:`, error);
      app.statusHistory = []; // Set empty array if status history fails
    }
    
    return app;
  }

  static async findAll(filters = {}) {
    let query = `SELECT * FROM applications`;
    
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters.college) {
      conditions.push('faculty_college = ?');
      params.push(filters.college);
    }

    if (filters.institution) {
      conditions.push('faculty_institution = ?');
      params.push(filters.institution);
    }

    if (filters.faculty_email) {
      conditions.push('faculty_email = ?');
      params.push(filters.faculty_email);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY submitted_at DESC`;

    const rows = await db.all(query, params);
    
    const applications = [];
    for (const row of rows) {
      const app = new Application(row);
      
      // Load status history for each application
      try {
        app.statusHistory = await app.getStatusHistory();
      } catch (error) {
        console.error(`Error loading status history for application ${app.id}:`, error);
        app.statusHistory = []; // Set empty array if status history fails
      }
      
      applications.push(app);
    }
    
    return applications;
  }

  static async search(query) {
    const searchQuery = `
      SELECT * FROM applications
      WHERE faculty_name LIKE ? OR faculty_email LIKE ? OR id LIKE ?
      ORDER BY submitted_at DESC
    `;
    
    const searchTerm = `%${query}%`;
    const rows = await db.all(searchQuery, [searchTerm, searchTerm, searchTerm]);
    
    const applications = [];
    for (const row of rows) {
      const app = new Application(row);
      
      // Load status history for each application
      try {
        app.statusHistory = await app.getStatusHistory();
      } catch (error) {
        console.error(`Error loading status history for application ${app.id}:`, error);
        app.statusHistory = []; // Set empty array if status history fails
      }
      
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

    // Get average processing time for completed applications (in days)
    const avgTimeQuery = `
      SELECT AVG(
        ((updated_at - submitted_at) / (1000.0 * 60 * 60 * 24))
      ) as avg_days 
      FROM applications 
      WHERE status = 'completed'
    `;
    const avgTimeResult = await db.get(avgTimeQuery);
    const averageProcessingTime = avgTimeResult.avg_days || 0;

    // Get stalled applications (more than 7 days since update)
    const stalledQuery = `
      SELECT * FROM applications
      WHERE status NOT IN ('completed', 'rejected') 
      AND CAST((julianday('now') - julianday(datetime(updated_at/1000, 'unixepoch'))) AS INTEGER) > 7
      ORDER BY updated_at ASC
    `;
    const stalledRows = await db.all(stalledQuery);
    
    const stalledApplications = stalledRows.map(row => {
      const app = new Application(row);
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