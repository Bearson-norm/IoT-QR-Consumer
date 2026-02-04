// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { getDB } = require('./database');
const scanRoutes = require('./routes/scan');
const reportRoutes = require('./routes/report');
const employeeRoutes = require('./routes/employee');
const authRoutes = require('./routes/auth');
const ovtRoutes = require('./routes/ovt');
const { startScheduler, stopScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/scan', scanRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ovt', ovtRoutes);

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/reporting', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reporting.html'));
});

app.get('/ovt-input', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ovt-input.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Start daily reset scheduler
  startScheduler();
});

// Graceful shutdown
process.on('SIGINT', () => {
  stopScheduler();
  const { closeDB } = require('./database');
  closeDB();
  process.exit(0);
});

