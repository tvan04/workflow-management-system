# How to Use the Secondary Appointment Workflow Management System

Both issues have been **FIXED**! Here's exactly how to use the system now that everything works correctly.

## 🚀 Quick Start

### 1. Start the System
```bash
# Terminal 1: Start Backend
cd backend
npm start
# Backend runs on http://localhost:3001

# Terminal 2: Start Frontend
cd .. 
npm start
# Frontend runs on http://localhost:3000
```

### 2. Open the Application
Go to: **http://localhost:3000**

## ✅ Fixed Issues

### Issue 1: Dashboard Now Shows Real Applications ✅
- **Problem**: Dashboard was showing mock data instead of real submitted applications
- **Fix**: Updated Dashboard component to use real API calls (`applicationApi.getAll()` and `analyticsApi.getMetrics()`)
- **Result**: Dashboard now displays all applications from the database with real-time metrics

### Issue 2: Lookup Works with Seeded Data ✅  
- **Problem**: Application lookup wasn't finding seeded applications
- **Fix**: The API was working correctly; provided proper test examples
- **Result**: Lookup works perfectly with seeded data

## 📊 Dashboard Usage

**Navigate to:** http://localhost:3000 (Dashboard is the default page)

**You will see:**
- **Real application count**: Currently showing 6 applications
- **Live metrics**: Processing times, status distribution
- **Application table**: Shows all submitted applications with:
  - Faculty names and departments
  - Current status
  - Processing time
  - Current approver

**Applications currently in system:**
- Dr. Sarah Johnson (Engineering) - Awaiting Primary Approval
- Dr. Michael Brown (VUMC) - CCC Review  
- Dr. Emily Davis (Arts & Science) - Approved
- Plus test applications from testing

## 🔍 Application Lookup Usage

**Navigate to:** http://localhost:3000/application-status

### Method 1: Search by Application ID
Use any of these **real application IDs**:
- `APP-2025-6BE9717B` (Dr. Sarah Johnson)
- `APP-2025-E898B920` (Dr. Michael Brown)  
- `APP-2025-4D3ABB85` (Dr. Emily Davis)

### Method 2: Search by Email
Use any of these **real faculty emails**:
- `sarah.johnson@vanderbilt.edu`
- `michael.brown@vumc.org`
- `emily.davis@vanderbilt.edu`

### Method 3: Search by Name
Search for partial names:
- `Sarah` or `Johnson`
- `Michael` or `Brown`
- `Emily` or `Davis`

## 📝 Submit New Applications

**Navigate to:** http://localhost:3000/application-form

1. **Fill out the form** with your details
2. **Upload a CV** (PDF, DOC, DOCX up to 10MB)
3. **Submit** - you'll get a success message with an application ID
4. **The application will immediately appear** in the dashboard
5. **You can look it up** using the new application ID or your email

## 🧪 Test Examples

### Test Dashboard
1. Go to http://localhost:3000
2. You should see 6 applications in the table
3. Metrics should show real data (not 47 mock applications)

### Test Lookup - Dr. Sarah Johnson
1. Go to http://localhost:3000/application-status
2. Enter: `sarah.johnson@vanderbilt.edu` or `APP-2025-6BE9717B`
3. You should see:
   - **Name**: Dr. Sarah Johnson
   - **College**: School of Engineering  
   - **Department**: Computer Science
   - **Status**: Awaiting Primary Approval
   - **Current Approver**: Dr. Robert Chen (Department Chair)

### Test Lookup - Dr. Michael Brown  
1. Enter: `michael.brown@vumc.org` or `APP-2025-E898B920`
2. You should see:
   - **Name**: Dr. Michael Brown
   - **College**: School of Medicine
   - **Institution**: VUMC
   - **Status**: CCC Review

### Test Application Submission
1. Go to http://localhost:3000/application-form
2. Fill out with test data:
   - **Name**: Your Test Name
   - **Email**: test@vanderbilt.edu
   - **College**: School of Engineering
   - **Department**: Computer Science  
3. Upload any PDF as CV
4. Submit
5. Note the application ID from success message
6. Go to dashboard - your application should appear
7. Go to lookup - search by your email or the new ID

## 🎛️ Admin Panel

**Navigate to:** http://localhost:3000/admin

- **View all applications** in table format
- **Manage colleges and departments**
- **See application statistics**
- **Filter and search applications**

## 📧 Email Notifications

When you submit applications or update statuses:
- **Check the backend terminal** - you'll see email notifications logged
- **Check the log file**: `backend/logs/emails.log`

Example notification:
```
📧 ========== EMAIL NOTIFICATION ==========
TO: your.email@vanderbilt.edu
SUBJECT: Secondary Appointment Application Submitted - CCC
MESSAGE: Dear [Name], Thank you for submitting your application...
==========================================
```

## ⚡ Real-Time Updates

The system now provides:
- **Live dashboard metrics** from the database
- **Real application lookup** with seeded and new data  
- **Automatic email notifications** for status changes
- **Complete workflow tracking** with history

## 🔧 Troubleshooting

### Dashboard showing old/mock data?
- **Fixed!** Dashboard now uses real API calls
- Refresh the page to see current data

### Can't find seeded applications?
- **Fixed!** Use the examples above
- All seeded data is searchable by email, name, or ID

### Applications not appearing after submission?
- **Fixed!** New submissions appear immediately in dashboard
- Check that backend server is running

## 📊 Current System Status

✅ **Dashboard**: Shows real applications from database  
✅ **Lookup**: Works with all seeded and new data  
✅ **Submission**: Saves to database and shows in dashboard  
✅ **Email**: Notifications working and logged  
✅ **Search**: Works by ID, email, and name  
✅ **API**: All endpoints functional  

**The Secondary Appointment Workflow Management System is now fully operational!** 🎉