require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const db = require('./config/database');

// Import routes
const applicationRoutes = require('./routes/applications');
const collegeRoutes = require('./routes/colleges');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const settingsRoutes = require('./routes/settings');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, uploadsDir)));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/applications', applicationRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/metrics', analyticsRoutes);
app.use('/api/trends', analyticsRoutes);
app.use('/api/export', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);

// Catch-all for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size too large' });
  }

  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await db.connect();
    await db.createTables();
    
    // Seed initial data if database is empty
    const seedData = require('./scripts/seed');
    await seedData.seedIfEmpty();
    
    // Start scheduler service for automated tasks
    const SchedulerService = require('./services/SchedulerService');
    SchedulerService.start();
    
    const PORT = process.env.PORT || 3001;
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database: ${process.env.DB_FILE || './data/database.sqlite'}`);
      console.log(`API Documentation: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      SchedulerService.stop();
      server.close(async () => {
        await db.close();
        console.log('Server closed');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;