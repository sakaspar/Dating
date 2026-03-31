require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { sanitizeInput } = require('./middleware/sanitize');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Initialize real-time chat
const { initChatSocket } = require('./socket/chat');
initChatSocket(io);

// Initialize group chat
const { initGroupChatSocket } = require('./socket/groupChat');
initGroupChatSocket(io);

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(compression()); // gzip compression for all responses
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput); // XSS protection on all inputs

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Static files with cache headers
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || './uploads'), {
  maxAge: '7d', // Cache static files for 7 days
  etag: true,
  lastModified: true,
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/safety', require('./routes/safety'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/backup', require('./routes/backup'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err.message || err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start backup scheduler
const { startBackupScheduler } = require('./utils/backup-scheduler');
startBackupScheduler();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Doukhou backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };
