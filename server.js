const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Enable Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Database connection check middleware for API requests
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  
  // 1 = connected, 2 = connecting
  if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
    return res.status(503).json({
      success: false,
      message: 'Database is not connected yet. Please check your MONGO_URI in .env file and ensure your IP is whitelisted in MongoDB Atlas (0.0.0.0/0).'
    });
  }
  next();
});

// Register API & Auth Routes
// Supports direct root endpoints (/register, /login) and scoped endpoints (/api/auth/...)
app.use('/', require('./routes/auth'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/events', require('./routes/events'));
app.use('/api/clubs', require('./routes/clubs'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/lostfound', require('./routes/lostfound'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting / Disconnected';
  res.status(200).json({
    status: 'OK',
    database: dbStatus,
    message: 'Campus Connect backend is active.'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'An internal server error occurred.'
  });
});

// Fallback to index.html for undefined browser routes
app.get('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express Server IMMEDIATELY so http://localhost:5000 is always reachable
app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`  🎓 CAMPUS CONNECT RUNNING AT: http://localhost:${PORT}`);
  console.log('================================================================');
  
  // Connect to MongoDB Atlas asynchronously in background
  connectDatabase();
});

// Asynchronous MongoDB Atlas Connection Handler
async function connectDatabase() {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    console.warn('\n[WARNING] MONGO_URI is not set in your .env file.');
    console.warn('Please open .env and add your MongoDB Atlas connection string.\n');
    return;
  }

  try {
    console.log('[DATABASE] Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000 // 5 second timeout so it doesn't hang
    });
    console.log('[DATABASE] MongoDB Atlas connected successfully!\n');
  } catch (error) {
    console.warn('\n[DATABASE WARNING] Could not connect to MongoDB Atlas:');
    console.warn(error.message);
    console.warn('\nTo fix database connection:');
    console.warn('1. Open .env file in d:\\campus_connect');
    console.warn('2. Replace MONGO_URI with your real MongoDB Atlas connection string.');
    console.warn('3. In MongoDB Atlas: Network Access -> Add IP Address -> Allow Access From Anywhere (0.0.0.0/0).\n');
  }
}
