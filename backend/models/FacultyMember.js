const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class FacultyMember {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.email = data.email;
    this.title = data.title;
    this.department = data.department;
    this.college = data.college;
    this.institution = data.institution; // 'vanderbilt' or 'vumc'
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    const query = `
      INSERT INTO faculty_members (
        id, name, email, title, department, college, institution, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      this.id, this.name, this.email, this.title, this.department,
      this.college, this.institution, this.createdAt, this.updatedAt
    ];

    await db.run(query, params);
    return this;
  }

  async update(updates) {
    const allowedFields = ['name', 'title', 'department', 'college'];
    const updateFields = [];
    const params = [];

    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field) && updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(updates[field]);
        this[field] = updates[field];
      }
    });

    if (updateFields.length === 0) {
      return this;
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = ?');
    params.push(new Date());
    this.updatedAt = new Date();

    params.push(this.id);

    const query = `
      UPDATE faculty_members 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await db.run(query, params);
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      title: this.title,
      department: this.department,
      college: this.college,
      institution: this.institution
    };
  }

  // Static methods
  static async findById(id) {
    const query = 'SELECT * FROM faculty_members WHERE id = ?';
    const row = await db.get(query, [id]);
    
    if (!row) return null;
    return new FacultyMember(row);
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM faculty_members WHERE email = ?';
    const row = await db.get(query, [email]);
    
    if (!row) return null;
    return new FacultyMember(row);
  }

  static async findOrCreate(facultyData) {
    // Always create a new faculty member record for each application
    // This ensures each application maintains its own snapshot of faculty data
    const faculty = new FacultyMember(facultyData);
    await faculty.save();
    return faculty;
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM faculty_members';
    const conditions = [];
    const params = [];

    if (filters.college) {
      conditions.push('college = ?');
      params.push(filters.college);
    }

    if (filters.institution) {
      conditions.push('institution = ?');
      params.push(filters.institution);
    }

    if (filters.department) {
      conditions.push('department = ?');
      params.push(filters.department);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY name ASC';

    const rows = await db.all(query, params);
    return rows.map(row => new FacultyMember(row));
  }

  static async search(searchTerm) {
    const query = `
      SELECT * FROM faculty_members 
      WHERE name LIKE ? OR email LIKE ? OR department LIKE ? OR college LIKE ?
      ORDER BY name ASC
    `;
    
    const term = `%${searchTerm}%`;
    const rows = await db.all(query, [term, term, term, term]);
    return rows.map(row => new FacultyMember(row));
  }

  // Validation methods
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isVanderbiltEmail = email.endsWith('@vanderbilt.edu') || email.endsWith('@vumc.org');
    return emailRegex.test(email) && isVanderbiltEmail;
  }

  static validateInstitution(email) {
    if (email.endsWith('@vanderbilt.edu')) {
      return 'vanderbilt';
    } else if (email.endsWith('@vumc.org')) {
      return 'vumc';
    }
    return null;
  }
}

module.exports = FacultyMember;