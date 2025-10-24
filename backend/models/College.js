const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class College {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.hasDepartments = data.hasDepartments !== undefined ? data.hasDepartments : true;
    this.deanName = data.deanName;
    this.deanEmail = data.deanEmail;
    this.deanTitle = data.deanTitle || 'Dean';
    this.seniorAssociateDeanName = data.seniorAssociateDeanName;
    this.seniorAssociateDeanEmail = data.seniorAssociateDeanEmail;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    const query = `
      INSERT INTO colleges (
        id, name, has_departments, dean_name, dean_email, dean_title,
        senior_associate_dean_name, senior_associate_dean_email, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      this.id, this.name, this.hasDepartments, this.deanName, this.deanEmail,
      this.deanTitle, this.seniorAssociateDeanName, this.seniorAssociateDeanEmail,
      this.createdAt, this.updatedAt
    ];

    await db.run(query, params);
    return this;
  }

  async update(updates) {
    const allowedFields = [
      'name', 'hasDepartments', 'deanName', 'deanEmail', 'deanTitle',
      'seniorAssociateDeanName', 'seniorAssociateDeanEmail'
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
      UPDATE colleges 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await db.run(query, params);
    return this;
  }

  async delete() {
    // First delete associated departments
    await db.run('DELETE FROM departments WHERE college_id = ?', [this.id]);
    
    // Then delete the college
    await db.run('DELETE FROM colleges WHERE id = ?', [this.id]);
  }

  async getDepartments() {
    if (!this.hasDepartments) {
      return [];
    }

    const query = 'SELECT * FROM departments WHERE college_id = ? ORDER BY name ASC';
    const rows = await db.all(query, [this.id]);
    
    const Department = require('./Department');
    return rows.map(row => new Department(row));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      hasDepartments: this.hasDepartments,
      dean: {
        name: this.deanName,
        email: this.deanEmail,
        title: this.deanTitle
      },
      seniorAssociateDean: this.seniorAssociateDeanName ? {
        name: this.seniorAssociateDeanName,
        email: this.seniorAssociateDeanEmail
      } : null
    };
  }

  // Static methods
  static async findById(id) {
    const query = 'SELECT * FROM colleges WHERE id = ?';
    const row = await db.get(query, [id]);
    
    if (!row) return null;
    return new College({
      id: row.id,
      name: row.name,
      hasDepartments: row.has_departments,
      deanName: row.dean_name,
      deanEmail: row.dean_email,
      deanTitle: row.dean_title,
      seniorAssociateDeanName: row.senior_associate_dean_name,
      seniorAssociateDeanEmail: row.senior_associate_dean_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  static async findByName(name) {
    const query = 'SELECT * FROM colleges WHERE name = ?';
    const row = await db.get(query, [name]);
    
    if (!row) return null;
    return new College({
      id: row.id,
      name: row.name,
      hasDepartments: row.has_departments,
      deanName: row.dean_name,
      deanEmail: row.dean_email,
      deanTitle: row.dean_title,
      seniorAssociateDeanName: row.senior_associate_dean_name,
      seniorAssociateDeanEmail: row.senior_associate_dean_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  static async findAll() {
    const query = 'SELECT * FROM colleges ORDER BY name ASC';
    const rows = await db.all(query);
    
    return rows.map(row => new College({
      id: row.id,
      name: row.name,
      hasDepartments: row.has_departments,
      deanName: row.dean_name,
      deanEmail: row.dean_email,
      deanTitle: row.dean_title,
      seniorAssociateDeanName: row.senior_associate_dean_name,
      seniorAssociateDeanEmail: row.senior_associate_dean_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  static async search(searchTerm) {
    const query = `
      SELECT * FROM colleges 
      WHERE name LIKE ? OR dean_name LIKE ?
      ORDER BY name ASC
    `;
    
    const term = `%${searchTerm}%`;
    const rows = await db.all(query, [term, term]);
    
    return rows.map(row => new College({
      id: row.id,
      name: row.name,
      hasDepartments: row.has_departments,
      deanName: row.dean_name,
      deanEmail: row.dean_email,
      deanTitle: row.dean_title,
      seniorAssociateDeanName: row.senior_associate_dean_name,
      seniorAssociateDeanEmail: row.senior_associate_dean_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
}

module.exports = College;