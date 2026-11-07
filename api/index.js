const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const deckRoutes = require('./routes/deck.routes');
const cardRoutes = require('./routes/card.routes');
const studyRoutes = require('./routes/study.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Initialize MongoDB connection
connectDB().catch((err) => {
  console.error('Initial MongoDB connection error in api/index.js:', err.message);
});

// Middleware configuration
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection middleware for serverless invocations
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Serverless DB connection error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to database cluster.',
      error: error.message,
    });
  }
});

// Health check endpoint (supports both /api/health and /health)
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'ConceptCards API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Mount modular routes (accepts both prefixed and non-prefixed paths for bulletproof Vercel serverless execution)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/decks', '/decks'], deckRoutes);
app.use(['/api/cards', '/cards'], cardRoutes);
app.use(['/api/study', '/study'], studyRoutes);

// 404 handler for unknown API routes
app.use(['/api', '/auth', '/decks', '/cards', '/study'], (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

const path = require('path');
const fs = require('fs');

// Serve static frontend assets if built (supports standalone production mode alongside Vercel serverless)
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Centralized error handling middleware
app.use(errorHandler);

// Listen locally when not running under Vercel serverless
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test' && (!process.env.VERCEL || process.env.VERCEL === '0')) {
  app.listen(PORT, () => {
    console.log(`ConceptCards API server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;

