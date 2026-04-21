'use strict';
require('dotenv').config();

// ── Environment Validation ────────────────────────────────────────────────────
const requiredEnv = ['JWT_SECRET', 'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'];
const missingEnv = requiredEnv.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`❌ Critical Environment Variables Missing: ${missingEnv.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');

const authRoutes         = require('./src/routes/auth');
const cancellationRoutes = require('./src/routes/cancellations');
const refundRoutes       = require('./src/routes/refunds');
const incidentRoutes     = require('./src/routes/incidents');
const userRoutes         = require('./src/routes/users');
const auditRoutes        = require('./src/routes/auditLogs');
const aiRoutes           = require('./src/routes/ai');
const resultTransferRoutes = require('./src/routes/resultTransferRoutes');
const notificationRoutes   = require('./src/routes/notificationRoutes');
const permissionRoutes      = require('./src/routes/permissions');


const app = express();

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Build allowed origins list
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins in development for easy local testing
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    
    // Allow requests with no origin (same-origin on Vercel, Postman, curl)
    if (!origin) return callback(null, true);

    // Allow explicitly listed origins
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

    // Allow Vercel preview/deployment domains
    if (origin.endsWith('.vercel.app')) return callback(null, true);

    console.warn(`CORS blocked: ${origin}`);
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Explicitly handle OPTIONS preflight for all routes
app.options('*', cors());

// ── Rate limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/', apiLimiter);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/cancellations', cancellationRoutes);
app.use('/api/refunds',       refundRoutes);
app.use('/api/incidents',     incidentRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/audit',         auditRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/results-transfer', resultTransferRoutes);
app.use('/api/notifications',     notificationRoutes);
app.use('/api/permissions',       permissionRoutes);


// ── Root ──────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ 
    success: true, 
    message: '🏥 Legacy Clinics Reporting Portal API is running',
    docs: 'Use /api/health for system status'
  });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🏥  Legacy Clinics Reporting Portal API`);
    console.log(`🚀  Server running on http://localhost:${PORT}`);
    console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

module.exports = app;
