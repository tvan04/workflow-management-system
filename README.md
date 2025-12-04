# CCC Secondary Appointment Workflow Management System

## Product Overview

The CCC Secondary Appointment Workflow Management System is a comprehensive web application that automates the complex process of managing secondary appointment applications to the College of Connected Computing (CCC) at Vanderbilt University. The system streamlines the entire approval workflow from initial application submission through final FIS (Faculty Information System) entry, replacing manual email chains and paper forms with a structured digital process.

## Features

### Core Functionality
- **Automated Workflow**: Digital approval process with multiple stakeholder routing
- **Real-time Status Tracking**: Live updates on application progress with audit trails
- **Email Integration**: Automatic notifications and reminders to all parties
- **Document Management**: CV upload and secure file storage
- **Digital Signatures**: Electronic approval capture for legal compliance
- **Administrative Dashboard**: Comprehensive oversight and management tools
- **Mobile-Responsive Interface**: Access from any device for approvers and administrators

### User-Specific Features
- **For Applicants**: Simple submission form, document upload, status tracking
- **For Approvers**: Secure email links, digital signature capture, approval/denial workflow
- **For Administrators**: Full application management, analytics, bulk operations, manual overrides

## Problem Statement

Faculty secondary appointments at universities involve complex approval workflows requiring coordination between multiple departments, administrators, and approval levels. Traditional methods using email chains and paper forms create several critical problems:

- **Process Delays**: Manual routing causes significant delays and bottlenecks
- **Lost Applications**: No centralized tracking leads to missed or forgotten applications
- **Lack of Transparency**: Applicants and administrators cannot see real-time status
- **Compliance Issues**: Difficulty maintaining proper audit trails and documentation
- **Administrative Overhead**: Manual coordination consumes significant staff time
- **Communication Gaps**: Inconsistent notifications and follow-up processes

This system solves these problems by providing a centralized, automated platform that ensures proper approvals, maintains complete audit trails, and provides real-time visibility into the entire process.

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Git

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../
   npm install
   ```

4. **Configure environment variables**
   
   Create `.env` file in the backend directory:
   ```env
   PORT=3001
   DATABASE_PATH=./data/database.sqlite
   FRONTEND_URL=url-or-localhost
   AMPLIFY_API_KEY=amplify-api-key
   REACT_APP_AMPLIFY_API_KEY=amplify-api-key
   TEST_EMAIL=your-email
   CCC_FACULTY_EMAIL=cccfacultyaffairs@vanderbilt.edu
   ```

   Create `.env` file in the frontend directory:
   ```env
   REACT_APP_AMPLIFY_API_KEY=amplify_key
   CCC_FACULTY_EMAIL=faculty_email
   TEST_EMAIL=your_email
   FRONTEND_URL=frontend_url
   ```

5. **Initialize the database**
   ```bash
   cd backend
   npm run init-db
   ```

## Usage

### Starting the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend development server** (in a new terminal)
   ```bash
   npm start
   ```

3. **Access the application**
   - Main Application: http://localhost:3000
   - Backend API: http://localhost:3001

### Application Workflow

1. **Faculty Submission**: Faculty members complete the application form and upload their CV
2. **CCC Review**: CCC staff review and approve the initial application
3. **Associate Dean Review**: CCC Associate Dean provides secondary approval
4. **Primary Approval**: Department chairs, deans, or other approvers from the primary institution
5. **FIS Entry**: Final administrative step to enter approved appointments into the university system
6. **Completion**: Automatic confirmation and process completion

### Key User Roles
- **Applicants**: Submit applications and track status
- **CCC Admin**: Manage all applications, perform FIS entry, system administration
- **CCC Associate Dean**: Provide secondary review and approval
- **Department/Division Chairs**: Approve applications from their units
- **Deans**: Final approval authority for their colleges

## Build Instructions

### Development Build
```bash
# Frontend development build
npm start

# Backend development build
cd backend
npm run dev
```

### Production Build
```bash
# Build frontend for production
npm run build

# Build backend for production
cd backend
npm run build
```

### Testing
```bash
# Run frontend tests
npm test

# Run backend tests
cd backend
npm test
```

### Handover and Continuation of Development
The following still need to be done for completion and handover of the project:
1. Final testing of every single workflow to iron out small details
2. AWS Cognito configuration to replace the dummy login currently in place
3. An email log within the admin panel to show all previous emails that have been sent -- this was a last-minute request by our sponsor.
4. Deployment on a hosted website
5. Oracle integration to automatically pull in approver emails (this was determined not feasible for the semester).
