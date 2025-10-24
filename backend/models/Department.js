const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class Department {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.collegeId = data.collegeId;
    this.name = data.name;
    this.chairName = data.chairName;
    this.chairEmail = data.chairEmail;
    this.chairTitle = data.chairTitle || 'Department Chair';
    this.divisionChairName = data.divisionChairName;
    this.divisionChairEmail = data.divisionChairEmail;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    const query = `
      INSERT INTO departments (
        id, college_id, name, chair_name, chair_email, chair_title,
        division_chair_name, division_chair_email, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      this.id, this.collegeId, this.name, this.chairName, this.chairEmail,
      this.chairTitle, this.divisionChairName, this.divisionChairEmail,
      this.createdAt, this.updatedAt
    ];

    await db.run(query, params);
    return this;
  }

  async update(updates) {
    const allowedFields = [
      'name', 'chairName', 'chairEmail', 'chairTitle',
      'divisionChairName', 'divisionChairEmail'
    ];
    
    const updateFields = [];
    const params = [];

    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field) && updates[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbField} = ?`);
        params.push(updates[field]);
        this[field] = updates[field];
      }
    });

    if (updateFields.length === 0) {
      return this;
    }

    updateFields.push('updated_at = ?');
    params.push(new Date());
    this.updatedAt = new Date();

    params.push(this.id);

    const query = `
      UPDATE departments 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await db.run(query, params);
    return this;
  }

  async delete() {
    await db.run('DELETE FROM departments WHERE id = ?', [this.id]);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      chair: {
        name: this.chairName,
        email: this.chairEmail,
        title: this.chairTitle
      },
      divisionChair: this.divisionChairName ? {
        name: this.divisionChairName,
        email: this.divisionChairEmail
      } : null
    };
  }

  // Static methods
  static async findById(id) {
    const query = 'SELECT * FROM departments WHERE id = ?';
    const row = await db.get(query, [id]);
    
    if (!row) return null;
    return new Department({
      id: row.id,
      collegeId: row.college_id,
      name: row.name,
      chairName: row.chair_name,
      chairEmail: row.chair_email,
      chairTitle: row.chair_title,
      divisionChairName: row.division_chair_name,
      divisionChairEmail: row.division_chair_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  static async findByCollege(collegeId) {
    const query = 'SELECT * FROM departments WHERE college_id = ? ORDER BY name ASC';
    const rows = await db.all(query, [collegeId]);
    
    return rows.map(row => new Department({
      id: row.id,
      collegeId: row.college_id,
      name: row.name,
      chairName: row.chair_name,
      chairEmail: row.chair_email,
      chairTitle: row.chair_title,
      divisionChairName: row.division_chair_name,
      divisionChairEmail: row.division_chair_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  static async findAll() {
    const query = `
      SELECT d.*, c.name as college_name
      FROM departments d
      JOIN colleges c ON d.college_id = c.id
      ORDER BY c.name ASC, d.name ASC
    `;
    const rows = await db.all(query);
    
    return rows.map(row => {
      const dept = new Department({
        id: row.id,
        collegeId: row.college_id,
        name: row.name,
        chairName: row.chair_name,
        chairEmail: row.chair_email,
        chairTitle: row.chair_title,
        divisionChairName: row.division_chair_name,
        divisionChairEmail: row.division_chair_email,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
      dept.collegeName = row.college_name;
      return dept;
    });
  }

  static async search(searchTerm) {
    const query = `
      SELECT d.*, c.name as college_name
      FROM departments d
      JOIN colleges c ON d.college_id = c.id
      WHERE d.name LIKE ? OR d.chair_name LIKE ?
      ORDER BY c.name ASC, d.name ASC
    `;
    
    const term = `%${searchTerm}%`;
    const rows = await db.all(query, [term, term]);
    
    return rows.map(row => {
      const dept = new Department({
        id: row.id,
        collegeId: row.college_id,
        name: row.name,
        chairName: row.chair_name,
        chairEmail: row.chair_email,
        chairTitle: row.chair_title,
        divisionChairName: row.division_chair_name,
        divisionChairEmail: row.division_chair_email,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
      dept.collegeName = row.college_name;
      return dept;
    });
  }
}

module.exports = Department;