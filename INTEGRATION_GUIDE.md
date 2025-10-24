# Frontend-Backend Integration Guide

This guide explains how to connect the existing React frontend with the newly created Node.js backend for the Secondary Appointment Workflow Management System.

## Quick Start

1. **Start the Backend**:
   ```bash
   cd backend
   npm install
   npm start
   # Server runs on http://localhost:3001
   ```

2. **Start the Frontend**:
   ```bash
   cd /  # (root directory)
   npm start
   # Frontend runs on http://localhost:3000
   ```

3. **Verify Integration**:
   - Open http://localhost:3000 in your browser
   - The frontend should now connect to the live backend API
   - Submit a test application to verify the integration

## API Integration Details

The frontend's `src/utils/api.ts` file is already configured to connect to the backend at `http://localhost:3001/api`. The API endpoints are fully compatible:

### Application Submission
- **Frontend**: `applicationApi.submit(formData)`
- **Backend**: `POST /api/applications` (with file upload support)

### Dashboard Data
- **Frontend**: `analyticsApi.getMetrics()`
- **Backend**: `GET /api/metrics`

### College Management
- **Frontend**: `organizationApi.getColleges()`
- **Backend**: `GET /api/colleges`

## Key Features Now Working

### ✅ Application Submission
- CV file upload (PDF, DOC, DOCX up to 10MB)
- Complete form validation
- Email notifications to faculty and staff
- Automatic approval chain detection

### ✅ Dashboard Analytics
- Real-time metrics (total applications, processing time, etc.)
- Stalled application detection (7+ days without update)
- Status distribution charts
- Recent activity tracking

### ✅ Application Management
- Full application lifecycle tracking
- Status updates with history
- Search and filtering capabilities
- Individual application details

### ✅ College & Department Management
- Dynamic college/department structure
- Approval chain configuration
- Support for colleges with/without departments

### ✅ Notification System
- Automated email notifications for:
  - Application submission confirmations
  - Status change alerts
  - Approval requests to chairs/deans
  - Reminder notifications for stalled applications

### ✅ Data Export & Reporting
- CSV export of application data
- Processing time trends
- Performance metrics
- Historical reporting

## Database Schema

The backend automatically creates and seeds the database with:
- 7 sample colleges (Engineering, Medicine, Arts & Science, etc.)
- Departments for colleges that have them
- 3 sample applications with different statuses
- Notification templates
- System settings

## Environment Configuration

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
DB_FILE=./data/database.sqlite
SMTP_HOST=smtp.vanderbilt.edu
SMTP_USER=your-email@vanderbilt.edu
SMTP_PASS=your-password
STALL_THRESHOLD_DAYS=7
PROCESSING_TIME_GOAL_WEEKS=2
```

### Frontend
The frontend is already configured to use `http://localhost:3001/api` as the backend URL via the `REACT_APP_API_URL` environment variable.

## Testing the Integration

### 1. Submit a Test Application
1. Go to the Application Form page
2. Fill out the form with test data
3. Upload a sample PDF as CV
4. Submit the application
5. Verify you see the success message

### 2. Check Dashboard
1. Go to the Dashboard page  
2. Verify you see metrics updating
3. Check that the new application appears in the table
4. Look for real-time status indicators

### 3. Test Status Updates
1. Use the backend API directly or through admin panel
2. Update an application status
3. Verify frontend reflects the change
4. Check that notifications are logged

## API Compatibility

The backend API is fully compatible with the frontend's expected interface:

```typescript
// Frontend expects this structure
interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

// Backend provides exactly this
app.get('/api/applications', (req, res) => {
  res.json({
    data: applications,
    message: `Found ${applications.length} applications`
  });
});
```

## File Upload Integration

The backend handles multipart form data for CV uploads:

```typescript
// Frontend sends FormData
const formData = new FormData();
formData.append('cvFile', file);
formData.append('name', 'Dr. John Doe');
// ... other fields

// Backend receives with multer middleware
router.post('/', upload.single('cvFile'), async (req, res) => {
  // File available as req.file
  // Form data available as req.body
});
```

## Error Handling

Both frontend and backend use consistent error handling:

```typescript
// Backend error response
res.status(400).json({ 
  error: 'Validation failed', 
  details: errors.array() 
});

// Frontend error handling
catch (error) {
  if (error.response?.data?.error) {
    setError(error.response.data.error);
  }
}
```

## Troubleshooting Common Issues

### 1. CORS Errors
- Backend is configured to allow `http://localhost:3000`
- If using different ports, update CORS configuration

### 2. File Upload Issues
- Check file size limits (10MB default)
- Verify file types (PDF, DOC, DOCX only)
- Ensure uploads directory has write permissions

### 3. Database Issues
- Database is automatically created in `backend/data/`
- If corrupted, delete and restart server to regenerate
- Check disk space for SQLite file

### 4. Email Notifications
- In development mode, emails are logged to console
- For production, configure SMTP settings properly
- Check spam folders for test emails

## Production Deployment

### Backend
1. Use PostgreSQL instead of SQLite
2. Configure production SMTP settings
3. Set up reverse proxy (nginx)
4. Enable SSL/TLS
5. Set `NODE_ENV=production`

### Frontend
1. Update `REACT_APP_API_URL` to production backend URL
2. Build with `npm run build`
3. Serve static files through web server
4. Configure routing for single-page app

## Security Considerations

### Implemented
- ✅ Input validation and sanitization
- ✅ File type and size restrictions
- ✅ Rate limiting on API endpoints
- ✅ SQL injection prevention
- ✅ CORS configuration
- ✅ Helmet.js security headers

### For Production
- [ ] User authentication and authorization
- [ ] Role-based access control
- [ ] API key authentication
- [ ] Audit logging
- [ ] Data encryption at rest

## Monitoring and Maintenance

The backend includes:
- Health check endpoint (`/health`)
- Comprehensive logging
- Scheduled jobs for maintenance
- Performance metrics tracking
- Automated reminder system

## Support

For technical issues:
1. Check browser console for frontend errors
2. Check backend logs for API errors
3. Run `node test.js` to verify backend functionality
4. Use `/health` endpoint to check backend status

The system is now fully functional and ready for testing and deployment!