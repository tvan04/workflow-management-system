# Secondary Appointment Workflow Management System - Backend

A comprehensive backend API for the College of Connected Computing (CCC) Secondary Appointment Workflow Management System at Vanderbilt University.

## Features

### Core Functionality
- **Application Management**: Submit, track, and manage secondary appointment applications
- **Approval Workflow**: Multi-stage approval process with configurable chains
- **Dashboard Analytics**: Real-time metrics and performance tracking
- **Notification System**: Automated email notifications for status changes
- **Data Export**: CSV/JSON export capabilities for reporting
- **College Management**: Organizational structure management

### Key Capabilities
- ✅ Complete REST API with validation
- ✅ File upload handling for CV documents
- ✅ SQLite database with full schema
- ✅ Automated reminder system for stalled applications
- ✅ Email notification service with templates
- ✅ Scheduled jobs for maintenance tasks
- ✅ Data analytics and reporting endpoints
- ✅ Comprehensive error handling and logging

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env file with your configuration
# The default values work for development

# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

The server will start on `http://localhost:3001` by default.

### Testing the API

```bash
# Run the test suite (make sure server is running first)
node test.js
```

## API Endpoints

### Applications
- `GET /api/applications` - Get all applications with optional filters
- `GET /api/applications/search?q={query}` - Search applications
- `GET /api/applications/:id` - Get application by ID
- `POST /api/applications` - Submit new application (with file upload)
- `PATCH /api/applications/:id/status` - Update application status
- `POST /api/applications/:id/remind` - Send reminder for stalled application
- `PUT /api/applications/:id` - Update application (admin fields)

### Colleges & Departments
- `GET /api/colleges` - Get all colleges with departments
- `GET /api/colleges/:id` - Get college by ID
- `POST /api/colleges` - Create new college
- `PUT /api/colleges/:id` - Update college
- `DELETE /api/colleges/:id` - Delete college
- `POST /api/colleges/:id/departments` - Add department to college

### Analytics & Reporting
- `GET /api/metrics` - Get dashboard metrics
- `GET /api/trends` - Get processing time trends
- `GET /api/export?format=csv|json` - Export application data
- `GET /api/analytics/status-distribution` - Get status distribution
- `GET /api/analytics/college-breakdown` - Get applications by college

### Notifications
- `GET /api/notifications/templates` - Get notification templates
- `POST /api/notifications/send` - Send manual notification
- `POST /api/notifications/bulk-reminders` - Send bulk reminders
- `GET /api/notifications/log` - Get notification history

### System Settings
- `GET /api/settings` - Get all system settings
- `GET /api/settings/:key` - Get specific setting
- `PUT /api/settings` - Update multiple settings
- `PUT /api/settings/:key` - Update specific setting

### Health & Status
- `GET /health` - Health check endpoint

## Database Schema

The system uses SQLite with the following main tables:

- **applications** - Core application data
- **faculty_members** - Faculty member profiles
- **colleges** - College information
- **departments** - Department information
- **status_history** - Application status change log
- **notifications_log** - Email notification log
- **notification_templates** - Email templates
- **system_settings** - Configuration settings

## Configuration

Key environment variables:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_FILE=./data/database.sqlite

# Email (for notifications)
SMTP_HOST=smtp.vanderbilt.edu
SMTP_PORT=587
SMTP_USER=your-email@vanderbilt.edu
SMTP_PASS=your-password
FROM_EMAIL=ccc-workflow@vanderbilt.edu

# File Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Application Settings
STALL_THRESHOLD_DAYS=7
PROCESSING_TIME_GOAL_WEEKS=2
```

## Workflow Process

The system implements the following workflow:

1. **Submitted** - Faculty member submits application
2. **CCC Review** - CCC staff reviews CV and rationale
3. **Faculty Vote** - (Currently bypassed until sufficient faculty)
4. **Awaiting Primary Approval** - Primary college chair/dean approval
5. **Approved** - All approvals received
6. **FIS Entry Pending** - Entering into Faculty Information System
7. **Completed** - Process complete, appointment active

## Automated Features

### Scheduled Jobs
- **Daily Reminders** (9 AM) - Send reminders for stalled applications
- **Processing Time Updates** (Midnight) - Calculate processing times
- **Weekly Reports** (Monday 8 AM) - Generate performance reports

### Email Notifications
- Application submitted confirmation
- Status change notifications
- Approval request notifications
- Reminder notifications for stalled applications

## Security Features

- Rate limiting on API endpoints
- Input validation and sanitization
- File type and size restrictions
- SQL injection prevention
- CORS configuration
- Helmet.js security headers

## Development

### Project Structure
```
backend/
├── config/
│   └── database.js          # Database connection and setup
├── models/
│   ├── Application.js       # Application model
│   ├── FacultyMember.js     # Faculty member model
│   ├── College.js           # College model
│   └── Department.js        # Department model
├── routes/
│   ├── applications.js      # Application routes
│   ├── colleges.js          # College routes
│   ├── analytics.js         # Analytics routes
│   ├── notifications.js     # Notification routes
│   └── settings.js          # Settings routes
├── services/
│   ├── NotificationService.js # Email service
│   └── SchedulerService.js   # Scheduled jobs
├── scripts/
│   └── seed.js              # Database seeding
├── server.js                # Main server file
└── test.js                  # API test suite
```

### Adding New Features

1. **Database Changes**: Update `config/database.js` schema
2. **Models**: Create/update model files in `models/`
3. **Routes**: Add endpoints in appropriate route files
4. **Services**: Add business logic in `services/`
5. **Tests**: Update `test.js` with new test cases

### Error Handling

The API uses consistent error response format:

```json
{
  "error": "Error description",
  "details": ["Validation error 1", "Validation error 2"]
}
```

Success responses follow this format:

```json
{
  "data": {...},
  "message": "Success message"
}
```

## Performance Considerations

- Database indexes on frequently queried fields
- Pagination for large result sets
- File size limits for uploads
- Rate limiting to prevent abuse
- Connection pooling for database access

## Troubleshooting

### Common Issues

1. **Database locked**: Check if another process is using the SQLite file
2. **File upload errors**: Verify `UPLOAD_DIR` permissions and `MAX_FILE_SIZE`
3. **Email not sending**: Check SMTP configuration in `.env`
4. **Port in use**: Change `PORT` in `.env` or kill the process using port 3001

### Logs

The server logs include:
- HTTP requests (via Morgan)
- Database operations
- Email sending attempts
- Scheduled job execution
- Error details

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use PostgreSQL instead of SQLite for better performance
3. Configure proper SMTP settings
4. Set up reverse proxy (nginx/Apache)
5. Enable SSL/TLS
6. Set up monitoring and logging
7. Configure backup procedures

## License

MIT License - See LICENSE file for details.

## Support

For issues or questions:
1. Check the logs for error details
2. Run the test suite to verify functionality
3. Contact the CCC IT team for production issues