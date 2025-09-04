const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import modules
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Reading App Server',
    version: '1.0.0',
    endpoints: {
      search: 'GET /api/search?query=<search_term>',
      bookDetails: 'GET /api/book/:source?url=<book_url>',
      chapterContent: 'GET /api/chapter/:source?url=<chapter_url>',
      health: 'GET /api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found` 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Reading App Server v1.0.0`);
  console.log(`🌐 Available endpoints:`);
  console.log(`   GET /api/search?query=<search_term>`);
  console.log(`   GET /api/book/:source?url=<book_url>`);
  console.log(`   GET /api/chapter/:source?url=<chapter_url>`);
  console.log(`   GET /api/health`);
  console.log(`   GET /`);
  console.log(`\n🔧 Environment:`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PORT: ${PORT}`);
  console.log(`   JINA_PROXY: ${process.env.ENABLE_JINA_PROXY || 'true'}`);
});
