# CCC Secondary Appointment Workflow Management System

A comprehensive web application for managing secondary appointment applications to the College of Connected Computing (CCC) at Vanderbilt University. This system streamlines the entire approval workflow from initial application submission through final FIS (Faculty Information System) entry.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- [User Roles](#user-roles)
- [Workflow Process](#workflow-process)
- [Admin Functions](#admin-functions)
- [Email Notifications](#email-notifications)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## Overview

The CCC Secondary Appointment Workflow Management System automates the complex process of reviewing and approving faculty secondary appointments. It replaces manual email chains and paper forms with a structured digital workflow that ensures proper approvals, maintains audit trails, and provides real-time status tracking.

### Key Benefits

- **Streamlined Process**: Automated routing through multiple approval levels
- **Real-time Tracking**: Live status updates and processing time metrics
- **Audit Trail**: Complete history of all approvals and status changes
- **Email Integration**: Automatic notifications to relevant parties
- **Administrative Oversight**: Comprehensive admin panel for managing all applications
- **Reminder System**: Automatic reminders for stuck applications
- **Analytics**: Dashboard with metrics and reporting capabilities

## Features

### For Applicants
- Simple web form for submitting applications
- CV upload with automatic file handling
- Real-time status tracking
- Email confirmations at each step

### For Approvers
- Secure approval links sent via email
- Digital signature capture
- Ability to approve or deny with comments
- Mobile-responsive approval interface

### For Administrators
- Complete application management dashboard
- Manual status override capabilities
- Bulk operations and analytics
- Email notification management
- Real-time metrics and reporting

## Architecture

### Frontend (React/TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom component library
- **Routing**: React Router for navigation
- **State Management**: React hooks and context
- **Icons**: Lucide React icons

### Backend (Node.js/Express)
- **Framework**: Express.js with TypeScript support
- **Database**: SQLite with SQL query builder
- **File Storage**: Database BLOB storage for CV files
- **Email**: Axios-based email service integration
- **Authentication**: Token-based approval system

### Database Schema
- **Applications**: Main application data and metadata
- **Status History**: Complete audit trail of status changes
- **Approval Tokens**: Secure links for approvers
- **Email Reminders**: Tracking of sent reminders
- **College Settings**: Configurable approval hierarchies

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Git (for cloning the repository)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd workflow-management-system
   ```

2. **Install dependencies**
   
   For the backend:
   ```bash
   cd backend
   npm install
   ```
   
   For the frontend:
   ```bash
   cd ../
   npm install
   ```

3. **Environment Setup**
   
   Create `.env` file in the backend directory:
   ```env
   PORT=3001
   DATABASE_PATH=./data/database.sqlite
   FRONTEND_URL=http://localhost:3000
   AMPLIFY_API_KEY=amplify-api-key
   REACT_APP_AMPLIFY_API_KEY=amplify-api-key
   TEST_EMAIL=your-email
   CCC_FACULTY_EMAIL=ccc@vanderbilt.edu
   ```

   Create `.env` file in the frontend directory:
   ```env
   REACT_APP_AMPLIFY_API_KEY=amplify_key
   CCC_FACULTY_EMAIL=faculty_email
   TEST_EMAIL=your_email
   FRONTEND_URL=frontend_url
   ```

4. **Database Initialization**
   ```bash
   cd backend
   npm run init-db
   ```

5. **Start the Application**
   
   Backend (in one terminal):
   ```bash
   cd backend
   npm start
   ```
   
   Frontend (in another terminal):
   ```bash
   npm start
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Admin Panel: http://localhost:3000/admin

## How It Works

### Application Lifecycle

```
Submission → CCC Review → CCC Associate Dean → Primary Approval → FIS Entry → Completed
     ↓            ↓              ↓                    ↓             ↓
   [Email]    [Email]        [Email]            [Email]       [Email]
```

### Status Definitions

| Status | Description | Who Acts |
|--------|-------------|-----------|
| **Submitted** | Initial application received | System |
| **CCC Review** | Under review by CCC faculty | CCC Admin |
| **CCC Associate Dean Review** | Awaiting CCC Associate Dean approval | CCC Associate Dean |
| **Awaiting Primary Approval** | Requires approval from primary department | Department Chair/Dean |
| **FIS Entry Pending** | Approved, awaiting FIS entry | CCC Admin |
| **Completed** | Process complete, entered in FIS | System |
| **Rejected** | Application denied at any stage | Various |

## User Roles

### 1. Applicants (Faculty Members)
- Submit new secondary appointment applications
- Upload CV and supporting documents
- Track application status
- Receive email updates

### 2. CCC Staff/Admin
- **Permissions**: Full administrative access
- **Responsibilities**: 
  - Initial application review
  - FIS entry completion
  - System administration
  - Manual overrides when needed

### 3. CCC Associate Dean
- **Permissions**: Approve/deny applications in CCC Associate Dean Review status
- **Responsibilities**: Secondary review of CCC-approved applications

### 4. Primary Department Approvers
Different roles depending on college structure:

#### Department Chair
- **When**: For colleges with departmental structure
- **Permissions**: Approve/deny applications from their department
- **Priority**: First in primary approval chain

#### Division Chair  
- **When**: For colleges with division structure
- **Permissions**: Approve/deny applications from their division
- **Priority**: Alternative to Department Chair

#### Dean
- **When**: Always available as fallback or for colleges without departments
- **Permissions**: Approve/deny applications from their college
- **Priority**: Final approver in chain

#### Senior Associate Dean
- **When**: For colleges that use this role
- **Permissions**: Approve/deny applications as intermediate step
- **Priority**: Between Division Chair and Dean

## Workflow Process

### 1. Application Submission

**Process**:
- Faculty member completes comprehensive application form
- Required fields: personal info, appointment details, rationale
- CV upload (PDF, DOC, DOCX formats supported)
- Automatic validation and error checking
- Immediate confirmation email sent

### 2. CCC Review Phase

**Process**:
- CCC Admin receives email notification with admin panel link
- Can edit any application details if needed
- Can approve directly or make modifications first
- Option to reject with comments
- Automatic advancement to CCC Associate Dean Review

### 3. CCC Associate Dean Review

**Process**:
- Secure, personalized approval link sent via email
- Digital signature required for approval
- Can add comments or notes
- Decision automatically advances workflow or ends process

### 4. Primary Approval Chain

**Process**:
- System determines required approvers based on college structure
- Sequential or parallel approval depending on configuration
- Each approver gets personalized approval link
- Digital signatures captured for audit trail
- Automatic progression when all approvals received

### 5. FIS Entry and Completion

**Process**:
- CCC Admin receives notification that all approvals are complete
- Uses admin panel to finalize FIS entry
- Marks application as completed in system
- Final confirmation email sent to applicant

## Admin Functions

### Dashboard Overview
The admin dashboard provides comprehensive oversight of all applications:

- **Real-time Metrics**: Total applications, completion rates, processing times
- **Status Distribution**: Visual breakdown of applications by current status  
- **Stalled Applications**: Automatic identification of delayed applications
- **Recent Activity**: Timeline of recent status changes and approvals
- **Analytics**: Trends, performance metrics, and reporting

### Application Management

#### View Applications
- **List View**: Sortable table with key information
- **Filters**: By status, date range, college, institution
- **Search**: By applicant name, application ID, or email
- **Export**: CSV export for external analysis

#### Edit Applications
- **Full Edit Access**: Modify any field in submitted applications
- **Approver Management**: Update approval chain members
- **Status Override**: Manually advance or change application status
- **File Management**: Replace or update uploaded CVs

#### Bulk Operations
- **Status Updates**: Change status for multiple applications
- **Email Notifications**: Resend notifications to approvers
- **Rejection Management**: Bulk reject with standardized reasons
- **Export Functions**: Generate reports for multiple applications

### Action Buttons

#### Approve Current Step Manually
- **When Available**: For applications that can be advanced
- **Function**: Bypasses normal approval process
- **Use Cases**: Emergency approvals, system fixes
- **Confirmation**: Requires admin confirmation before proceeding

#### Reject Application  
- **When Available**: For any non-completed, non-rejected application
- **Function**: Immediately moves application to rejected status
- **Confirmation**: "This action cannot be undone" warning
- **Result**: Automatic rejection email sent to applicant

#### Resend Email Notification
- **When Available**: For applications in active status
- **Function**: Resends appropriate notification based on current status
- **Smart Routing**: Automatically determines correct recipient and email type
- **Use Cases**: Email delivery issues, approver changes

## Email Notifications

### Automatic Notifications

| Trigger | Recipient | Content | Action Required |
|---------|-----------|---------|-----------------|
| Application Submitted | Applicant | Confirmation with tracking info | None |
| CCC Review Required | CCC Admin | New application notification | Review and approve |
| Associate Dean Review | CCC Associate Dean | Approval request with secure link | Approve/Deny |
| Primary Approval Needed | Department Approvers | Approval request with secure link | Approve/Deny |
| FIS Entry Required | CCC Admin | All approvals complete | Complete FIS entry |
| Application Completed | Applicant | Final confirmation | None |
| Application Rejected | Applicant | Rejection notification with reason | None |

### Reminder System

**Automatic Reminders**:
- Sent after 7 days of inactivity on any application
- Smart recipient detection based on current status
- Different email content for CCC staff vs external approvers
- Includes direct links to appropriate interfaces

**Reminder Logic**:
- **CCC Review/FIS Entry**: Admin panel edit links for CCC staff
- **Other Statuses**: Signature page links for external approvers
- **Frequency**: Weekly reminders until action taken
- **Escalation**: Tracked in admin dashboard

### Email Content Features

- **Responsive Design**: Works on all devices and email clients
- **Secure Links**: Time-limited, single-use approval tokens
- **Rich Information**: Complete application details in notifications
- **Branding**: Vanderbilt/CCC branded templates
- **Accessibility**: Screen reader compatible content

## API Documentation

### Core Endpoints

#### Applications
```
GET    /api/applications           # List all applications
POST   /api/applications           # Create new application  
GET    /api/applications/:id       # Get specific application
PUT    /api/applications/:id       # Update application
PATCH  /api/applications/:id/status # Update application status
DELETE /api/applications/:id       # Delete application
```

#### Approvals
```
POST   /api/applications/:id/approve              # Process approval
POST   /api/applications/:id/advance-to-associate-dean # Advance to next step
POST   /api/applications/:id/resend-notification  # Resend notifications
POST   /api/applications/validate-token           # Validate approval tokens
```

#### Analytics
```
GET    /api/analytics/metrics      # Dashboard metrics
GET    /api/analytics/trends       # Trend data
GET    /api/analytics/export       # Export data
```

#### File Management
```
GET    /api/applications/:id/cv    # Download CV file
POST   /api/applications/:id/cv    # Upload new CV
```

### Authentication

The system uses token-based authentication for approvers:
- **Approval Tokens**: Generated for each approval request
- **Single Use**: Tokens expire after one use
- **Time Limited**: 30-day expiration on unused tokens
- **Secure**: Cryptographically signed and validated

### Error Handling

All API endpoints return consistent error responses:
```json
{
  "error": "Error message",
  "details": ["Detailed error information"],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Development

### Project Structure
```
workflow-management-system/
├── backend/                 # Express.js API server
│   ├── config/             # Database and environment config
│   ├── models/             # Data models and database queries
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic and external services
│   ├── scripts/            # Database migrations and utilities
│   └── data/               # SQLite database files
├── src/                    # React frontend application
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components and routing
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Helper functions and API clients
│   └── styles/             # CSS and styling files
└── public/                 # Static assets and HTML template
```

### Key Technologies

**Frontend**:
- React 18 with Hooks and Context
- TypeScript for type safety
- Tailwind CSS for styling
- React Router for navigation
- Lucide React for icons

**Backend**:
- Express.js for API server
- SQLite for data persistence
- Node.js with ES modules
- Axios for email service integration
- Express Validator for input validation

**Development Tools**:
- ESLint and Prettier for code formatting
- TypeScript compiler for type checking
- Nodemon for development server
- Git hooks for pre-commit validation

### Database Schema

#### Applications Table
```sql
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  faculty_name TEXT NOT NULL,
  faculty_email TEXT NOT NULL,
  faculty_title TEXT NOT NULL,
  faculty_department TEXT,
  faculty_college TEXT NOT NULL,
  faculty_institution TEXT NOT NULL,
  appointment_percentage REAL NOT NULL,
  duration TEXT NOT NULL,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  cv_file_data BLOB,
  cv_file_name TEXT,
  cv_file_size INTEGER,
  cv_mime_type TEXT,
  submitted_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  -- Approver information
  department_chair_name TEXT,
  department_chair_email TEXT,
  division_chair_name TEXT,
  division_chair_email TEXT,
  dean_name TEXT,
  dean_email TEXT,
  senior_associate_dean_name TEXT,
  senior_associate_dean_email TEXT,
  -- Process tracking
  fis_entered BOOLEAN DEFAULT FALSE,
  fis_entry_date INTEGER,
  processing_time_weeks REAL
);
```

#### Status History Table
```sql
CREATE TABLE status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  approver TEXT,
  notes TEXT,
  approver_token TEXT,
  FOREIGN KEY (application_id) REFERENCES applications (id)
);
```

### Testing

**Frontend Testing**:
```bash
npm test                    # Run React test suite
npm run test:coverage       # Generate coverage report
```

**Backend Testing**:
```bash
cd backend
npm test                    # Run API tests
npm run test:integration    # Integration tests
```

### Deployment

**Production Build**:
```bash
npm run build              # Build frontend
cd backend && npm run build # Build backend
```

**Environment Variables**:
- Set production EMAIL_API_KEY and EMAIL_API_URL
- Configure production FRONTEND_URL
- Set secure database path
- Configure proper CCC_FACULTY_EMAIL

## Troubleshooting

### Common Issues

#### Email Delivery Problems
- **Symptoms**: Notifications not being received
- **Causes**: Invalid API keys, network issues, spam filters
- **Solutions**: Check email service logs, verify API configuration, test with known good email

#### Database Connection Errors  
- **Symptoms**: 500 errors, "database locked" messages
- **Causes**: File permissions, concurrent access, disk space
- **Solutions**: Check file permissions, restart services, verify disk space

#### Application Status Stuck
- **Symptoms**: Applications not advancing through workflow
- **Causes**: Missing approver information, email delivery failures
- **Solutions**: Use admin panel to manually advance, check approver email addresses, resend notifications

#### File Upload Issues
- **Symptoms**: CV uploads failing or corrupted
- **Causes**: File size limits, unsupported formats, storage issues  
- **Solutions**: Check file size and format, verify storage configuration, test with sample files

### Logs and Debugging

**Backend Logs**:
```bash
cd backend
npm run logs               # View application logs
npm run debug              # Start in debug mode
```

**Frontend Debugging**:
- Use browser developer tools
- Check network tab for API call failures  
- Examine console for JavaScript errors

**Database Debugging**:
```bash
cd backend/data
sqlite3 database.sqlite
.tables                    # List tables
.schema applications       # View table schema
SELECT * FROM applications LIMIT 5; # Sample data
```

### Support and Maintenance

**Regular Maintenance Tasks**:
- Monitor disk space for database growth
- Review and clean old status history records
- Update approval chain information as staff changes
- Test email delivery periodically
- Monitor application processing times

**Backup Procedures**:
```bash
# Backup database
cp backend/data/database.sqlite backup/database-$(date +%Y%m%d).sqlite

# Backup uploaded files (if using file system storage)
tar -czf backup/uploads-$(date +%Y%m%d).tar.gz backend/uploads/
```

---

## License

This project is proprietary software developed for Vanderbilt University's College of Connected Computing. All rights reserved.

## Contact

For technical support or questions about the CCC Secondary Appointment Workflow Management System, contact:

**CCC Faculty Affairs**  
Email: cccfacultyaffairs@vanderbilt.edu  
