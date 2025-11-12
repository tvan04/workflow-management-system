const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const dbPath = process.env.DB_FILE || './data/database.sqlite';
      const dbDir = path.dirname(dbPath);

      // Create data directory if it doesn't exist
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to SQLite database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          // Enable foreign key constraints
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  async createTables() {
    // First check if we need to add the cv_file_data column for BLOB storage
    await this.addMissingColumns();
    
    const queries = [
      // Colleges table
      `CREATE TABLE IF NOT EXISTS colleges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        has_departments BOOLEAN NOT NULL DEFAULT 1,
        dean_name TEXT NOT NULL,
        dean_email TEXT NOT NULL,
        dean_title TEXT NOT NULL,
        senior_associate_dean_name TEXT,
        senior_associate_dean_email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Departments table
      `CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        college_id TEXT NOT NULL,
        name TEXT NOT NULL,
        chair_name TEXT NOT NULL,
        chair_email TEXT NOT NULL,
        chair_title TEXT NOT NULL,
        division_chair_name TEXT,
        division_chair_email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (college_id) REFERENCES colleges (id) ON DELETE CASCADE
      )`,

      // Faculty members table
      `CREATE TABLE IF NOT EXISTS faculty_members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        department TEXT,
        college TEXT NOT NULL,
        institution TEXT NOT NULL CHECK (institution IN ('vanderbilt', 'vumc')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Applications table with embedded faculty data
      `CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        
        -- Faculty information (embedded directly)
        faculty_name TEXT NOT NULL,
        faculty_email TEXT NOT NULL,
        faculty_title TEXT NOT NULL,
        faculty_department TEXT,
        faculty_college TEXT NOT NULL,
        faculty_institution TEXT NOT NULL CHECK (faculty_institution IN ('vanderbilt', 'vumc')),
        
        -- Application details
        status TEXT NOT NULL CHECK (status IN (
          'submitted', 'ccc_review', 'ccc_associate_dean_review', 'faculty_vote', 'awaiting_primary_approval',
          'approved', 'rejected', 'fis_entry_pending', 'completed'
        )),
        appointment_type TEXT NOT NULL CHECK (appointment_type IN ('initial', 'secondary')),
        effective_date DATE,
        duration TEXT CHECK (duration IN ('1year', '2year', '3year')),
        rationale TEXT,
        contributions_question TEXT,
        alignment_question TEXT,
        enhancement_question TEXT,
        
        -- CV file information
        cv_file_path TEXT,
        cv_file_name TEXT,
        cv_file_data BLOB,
        cv_file_size INTEGER,
        cv_mime_type TEXT,
        
        -- Approval chain
        department_chair_name TEXT,
        department_chair_email TEXT,
        division_chair_name TEXT,
        division_chair_email TEXT,
        dean_name TEXT,
        dean_email TEXT,
        senior_associate_dean_name TEXT,
        senior_associate_dean_email TEXT,
        has_departments BOOLEAN NOT NULL DEFAULT 1,
        
        -- Timestamps and tracking
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        current_approver TEXT,
        fis_entered BOOLEAN DEFAULT 0,
        fis_entry_date DATETIME,
        processing_time_weeks REAL,
        primary_appointment_end_date DATE
      )`,

      // Status history table
      `CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        approver TEXT,
        notes TEXT,
        FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE
      )`,

      // Notification functionality removed

      // System settings table
      `CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Users table (for future authentication)
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        role TEXT NOT NULL CHECK (role IN ('faculty', 'ccc_staff', 'dean', 'chair', 'admin')),
        name TEXT NOT NULL,
        active BOOLEAN DEFAULT 1,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const query of queries) {
      await this.run(query);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)',
      'CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON applications(submitted_at)',
      'CREATE INDEX IF NOT EXISTS idx_applications_faculty_email ON applications(faculty_email)',
      'CREATE INDEX IF NOT EXISTS idx_status_history_application ON status_history(application_id)',
      'CREATE INDEX IF NOT EXISTS idx_departments_college ON departments(college_id)'
    ];

    for (const indexQuery of indexes) {
      await this.run(indexQuery);
    }

    console.log('Database tables created successfully');
  }

  async addMissingColumns() {
    try {
      // Check if cv_file_data column exists in applications table
      const columns = await this.all("PRAGMA table_info(applications)");
      const hasCvFileDataColumn = columns.some(col => col.name === 'cv_file_data');
      const hasCvFileSizeColumn = columns.some(col => col.name === 'cv_file_size');
      const hasCvMimeTypeColumn = columns.some(col => col.name === 'cv_mime_type');
      
      if (!hasCvFileDataColumn) {
        console.log('Adding cv_file_data BLOB column to applications table...');
        await this.run('ALTER TABLE applications ADD COLUMN cv_file_data BLOB');
      }
      
      if (!hasCvFileSizeColumn) {
        console.log('Adding cv_file_size column to applications table...');
        await this.run('ALTER TABLE applications ADD COLUMN cv_file_size INTEGER');
      }
      
      if (!hasCvMimeTypeColumn) {
        console.log('Adding cv_mime_type column to applications table...');
        await this.run('ALTER TABLE applications ADD COLUMN cv_mime_type TEXT');
      }
    } catch (error) {
      console.error('Error adding missing columns:', error);
      // Don't throw - let the application continue in case the table doesn't exist yet
    }
  }

  run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new Database();