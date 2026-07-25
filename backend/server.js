const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Ensure local JSON DB is initialized
const database = require('./config/database');
database.getJsonDb(); // Runs initializer if db_store.json doesn't exist

// Start Excel file watch listener (bidirectional sync)
const excelSyncService = require('./services/excelSyncService');
excelSyncService.watchExcelFile();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse JSON request payloads
app.use(express.json());

// API Routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/units', require('./routes/units'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/demands', require('./routes/demands'));
app.use('/api/excel', require('./routes/excel'));

// Serve Frontend Static files
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Catch-all route to serve the SPA (index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Centralized error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Builder ERP & Construction MIS Server is Running     `);
  console.log(`  Local URL: http://localhost:${PORT}                  `);
  console.log(`  Database Mode: ${database.isPg ? 'PostgreSQL' : 'JSON DB Store Fallback'}`);
  console.log(`=======================================================`);
});
