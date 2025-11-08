const db = require('../config/database');
const College = require('../models/College');
const Department = require('../models/Department');
const FacultyMember = require('../models/FacultyMember');
const Application = require('../models/Application');

class SeedData {
  async seedIfEmpty() {
    try {
      // Check if database already has data
      const collegeCount = await db.get('SELECT COUNT(*) as count FROM colleges');
      if (collegeCount.count > 0) {
        console.log('Database already has data, skipping seed');
        return;
      }

      console.log('Seeding initial data...');
      
      await this.seedColleges();
      await this.seedSystemSettings();
      await this.seedNotificationTemplates();
      await this.seedSampleApplications();
      
      console.log('Database seeded successfully');
    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  }

  async seedColleges() {
    const colleges = [
      {
        name: 'School of Engineering',
        hasDepartments: true,
        deanName: 'Dr. Patricia Williams',
        deanEmail: 'patricia.williams@vanderbilt.edu',
        deanTitle: 'Dean',
        departments: [
          {
            name: 'Computer Science',
            chairName: 'Dr. Robert Chen',
            chairEmail: 'robert.chen@vanderbilt.edu',
            chairTitle: 'Department Chair'
          },
          {
            name: 'Biomedical Engineering',
            chairName: 'Dr. Lisa Anderson',
            chairEmail: 'lisa.anderson@vanderbilt.edu',
            chairTitle: 'Department Chair'
          },
          {
            name: 'Electrical Engineering',
            chairName: 'Dr. Michael Johnson',
            chairEmail: 'michael.johnson@vanderbilt.edu',
            chairTitle: 'Department Chair'
          }
        ]
      },
      {
        name: 'College of Arts & Science',
        hasDepartments: true,
        deanName: 'Dr. John Geer',
        deanEmail: 'john.geer@vanderbilt.edu',
        deanTitle: 'Dean',
        departments: [
          {
            name: 'Psychology',
            chairName: 'Dr. James Wilson',
            chairEmail: 'james.wilson@vanderbilt.edu',
            chairTitle: 'Department Chair'
          },
          {
            name: 'Mathematics',
            chairName: 'Dr. Sarah Martinez',
            chairEmail: 'sarah.martinez@vanderbilt.edu',
            chairTitle: 'Department Chair'
          }
        ]
      },
      {
        name: 'School of Medicine',
        hasDepartments: true,
        deanName: 'Dr. Jennifer Davis',
        deanEmail: 'jennifer.davis@vumc.org',
        deanTitle: 'Dean'
      },
      {
        name: 'Owen Graduate School of Management',
        hasDepartments: false,
        deanName: 'Dr. Eric Johnson',
        deanEmail: 'eric.johnson@vanderbilt.edu',
        deanTitle: 'Dean'
      },
      {
        name: 'Blair School of Music',
        hasDepartments: false,
        deanName: 'Dr. Mark Wait',
        deanEmail: 'mark.wait@vanderbilt.edu',
        deanTitle: 'Dean'
      },
      {
        name: 'School of Nursing',
        hasDepartments: false,
        deanName: 'Dr. Susan Miller',
        deanEmail: 'susan.miller@vanderbilt.edu',
        deanTitle: 'Dean'
      },
      {
        name: 'Divinity School',
        hasDepartments: false,
        deanName: 'Dr. Michael Thompson',
        deanEmail: 'michael.thompson@vanderbilt.edu',
        deanTitle: 'Dean'
      }
    ];

    for (const collegeData of colleges) {
      const { departments, ...collegInfo } = collegeData;
      
      const college = new College(collegInfo);
      await college.save();
      
      if (departments) {
        for (const deptData of departments) {
          const department = new Department({
            ...deptData,
            collegeId: college.id
          });
          await department.save();
        }
      }
    }

    console.log(`Seeded ${colleges.length} colleges`);
  }

  async seedSystemSettings() {
    const settings = [
      {
        key: 'stall_threshold_days',
        value: '7',
        description: 'Number of days after which an application is considered stalled'
      },
      {
        key: 'processing_time_goal_weeks',
        value: '2',
        description: 'Target processing time in weeks'
      },
      {
        key: 'reminder_frequency_hours',
        value: '168',
        description: 'Frequency of automatic reminders in hours (168 = 1 week)'
      },
      {
        key: 'ccc_staff_emails',
        value: 'ccc-staff@vanderbilt.edu',
        description: 'Comma-separated list of CCC staff email addresses'
      },
      {
        key: 'enable_faculty_vote',
        value: 'false',
        description: 'Whether faculty voting is enabled (bypassed until sufficient faculty)'
      },
      {
        key: 'max_file_size_mb',
        value: '10',
        description: 'Maximum file size for CV uploads in MB'
      },
      {
        key: 'ccc_associate_dean_email',
        value: 'associate.dean.ccc@vanderbilt.edu',
        description: 'Email address for CCC Associate Dean approval notifications'
      }
    ];

    for (const setting of settings) {
      const query = `
        INSERT INTO system_settings (key, value, description, updated_at)
        VALUES (?, ?, ?, ?)
      `;
      await db.run(query, [setting.key, setting.value, setting.description, new Date().toISOString()]);
    }

    console.log(`Seeded ${settings.length} system settings`);
  }

  async seedNotificationTemplates() {
    const templates = [
      {
        id: 'app_submitted_faculty',
        name: 'Application Submitted - Faculty',
        subject: 'Secondary Appointment Application Submitted - CCC',
        bodyText: `Dear {{facultyName}},

Thank you for submitting your secondary appointment application to the College of Connected Computing (CCC).

Application Details:
- Application ID: {{applicationId}}
- Submitted: {{submittedDate}}
- Status: Under CCC Review

Your application is now in the CCC review queue. You will receive email notifications as your application progresses through the approval process.

Best regards,
CCC Administrative Team`,
        type: 'status_change',
        recipientRole: 'faculty'
      },
      {
        id: 'status_change_faculty',
        name: 'Status Change - Faculty',
        subject: 'Application Status Update - {{applicationId}}',
        bodyText: `Dear {{facultyName}},

Your secondary appointment application status has been updated.

Application ID: {{applicationId}}
New Status: {{newStatus}}
Current Approver: {{currentApprover}}

{{statusMessage}}

Best regards,
CCC Administrative Team`,
        type: 'status_change',
        recipientRole: 'faculty'
      },
      {
        id: 'approval_request_chair',
        name: 'Approval Request - Chair',
        subject: 'Secondary Appointment Approval Request - {{facultyName}}',
        bodyText: `Dear {{approverName}},

A faculty member from your department has applied for a secondary appointment with the College of Connected Computing (CCC) and requires your approval to proceed.

Faculty Member: {{facultyName}}
Department: {{department}}
Application ID: {{applicationId}}

Please review this request and provide your approval or feedback.

Best regards,
CCC Administrative Team`,
        type: 'approval_request',
        recipientRole: 'chair'
      },
      {
        id: 'reminder_stalled',
        name: 'Reminder - Stalled Application',
        subject: 'Reminder: Secondary Appointment Approval Needed - {{facultyName}}',
        bodyText: `This is a friendly reminder that a secondary appointment application requires your attention.

Faculty Member: {{facultyName}}
Application ID: {{applicationId}}
Days Since Last Update: {{daysSinceUpdate}}

Please review and provide your approval or feedback at your earliest convenience.

Best regards,
CCC Administrative Team`,
        type: 'reminder',
        recipientRole: 'chair'
      }
    ];

    for (const template of templates) {
      const query = `
        INSERT INTO notification_templates (id, name, subject, body_text, type, recipient_role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const now = new Date().toISOString();
      await db.run(query, [
        template.id, template.name, template.subject, template.bodyText,
        template.type, template.recipientRole, now, now
      ]);
    }

    console.log(`Seeded ${templates.length} notification templates`);
  }

  async seedSampleApplications() {
    // Create sample faculty members and applications
    const sampleFaculty = [
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@vanderbilt.edu',
        title: 'Associate Professor',
        department: 'Computer Science',
        college: 'School of Engineering',
        institution: 'vanderbilt'
      },
      {
        name: 'Dr. Michael Brown',
        email: 'michael.brown@vumc.org',
        title: 'Professor',
        department: 'Biomedical Informatics',
        college: 'School of Medicine',
        institution: 'vumc'
      },
      {
        name: 'Dr. Emily Davis',
        email: 'emily.davis@vanderbilt.edu',
        title: 'Assistant Professor',
        department: 'Psychology',
        college: 'College of Arts & Science',
        institution: 'vanderbilt'
      }
    ];

    const applications = [];

    for (let i = 0; i < sampleFaculty.length; i++) {
      const facultyData = sampleFaculty[i];
      
      // Create faculty member
      const faculty = new FacultyMember(facultyData);
      await faculty.save();

      // Create application
      const submittedDate = new Date();
      submittedDate.setDate(submittedDate.getDate() - (i * 7 + 3)); // Stagger submission dates

      const appData = {
        facultyMemberId: faculty.id,
        appointmentType: 'secondary',
        effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        duration: ['1year', '2year', '3year'][i],
        rationale: `I am seeking a secondary appointment in CCC to collaborate on research projects that align with my expertise and CCC's mission of advancing connected computing solutions. This appointment would enable interdisciplinary collaboration and contribute to innovative research in ${facultyData.department}.`,
        
        // Approval chain based on college
        deanName: facultyData.college === 'School of Engineering' ? 'Dr. Patricia Williams' :
                  facultyData.college === 'School of Medicine' ? 'Dr. Jennifer Davis' :
                  'Dr. John Geer',
        deanEmail: facultyData.college === 'School of Engineering' ? 'patricia.williams@vanderbilt.edu' :
                   facultyData.college === 'School of Medicine' ? 'jennifer.davis@vumc.org' :
                   'john.geer@vanderbilt.edu',
        
        hasDepartments: facultyData.college !== 'Owen Graduate School of Management',
        departmentChairName: facultyData.department === 'Computer Science' ? 'Dr. Robert Chen' :
                             facultyData.department === 'Psychology' ? 'Dr. James Wilson' :
                             null,
        departmentChairEmail: facultyData.department === 'Computer Science' ? 'robert.chen@vanderbilt.edu' :
                              facultyData.department === 'Psychology' ? 'james.wilson@vanderbilt.edu' :
                              null,
        
        submittedAt: submittedDate
      };

      const application = new Application(appData);
      await application.save();

      // Set different statuses for demonstration
      if (i === 0) {
        await application.updateStatus('awaiting_primary_approval', 'CCC Staff', 'Approved for primary college review');
      } else if (i === 1) {
        await application.updateStatus('ccc_review', 'CCC Staff', 'Under CCC review');
      } else {
        await application.updateStatus('approved', 'Dr. John Geer', 'All approvals completed');
        await application.update({ processingTimeWeeks: 3.5 });
      }

      applications.push(application);
    }

    console.log(`Seeded ${applications.length} sample applications`);
  }
}

module.exports = new SeedData();