require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config');

// Import routes
const stocksRouter = require('./routes/stocks');
const regimeRouter = require('./routes/regime');
const portfolioRouter = require('./routes/portfolio');
const refreshRouter = require('./routes/refresh');
const { startScheduler } = require('./services/scheduler');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/stocks', stocksRouter);
app.use('/api/regime', regimeRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/refresh', refreshRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  startScheduler();
}

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ API endpoints available at http://localhost:${PORT}/api`);
  console.log('\nAvailable endpoints:');
  console.log('  GET  /api/stocks');
  console.log('  POST /api/stocks');
  console.log('  DELETE /api/stocks/:ticker');
  console.log('  PUT  /api/stocks/:ticker/notes');
  console.log('  POST /api/stocks/refresh');
  console.log('  POST /api/stocks/refresh/quotes');
  console.log('  POST /api/stocks/refresh/details');
  console.log('  POST /api/stocks/refresh/all');
  console.log('  GET  /api/regime');
  console.log('  POST /api/regime/refresh');
  console.log('  GET  /api/portfolio/summary');
  console.log('  POST /api/refresh');
  console.log('\n');
});
