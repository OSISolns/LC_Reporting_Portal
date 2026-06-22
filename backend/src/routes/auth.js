'use strict';
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { validate, body } = require('../middleware/validation');

const rateLimit = require('express-rate-limit');

const allowDevLogin = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_LOGIN !== 'false';

// Login Brute-force Protection
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each username to 5 login requests per windowMs
  keyGenerator: (req, res) => {
    // Lockout based on the username being attempted, fallback to IP
    return req.body && req.body.username ? req.body.username.toLowerCase() : req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { 
    success: false, 
    message: 'Too many login attempts for this account, please try again after 15 minutes.' 
  },
});

router.post(
  '/login',
  loginLimiter,
  validate([
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  authController.login
);

if (allowDevLogin) {
  router.post(
    '/dev-login',
    validate([
      body('username').notEmpty().withMessage('Username is required'),
    ]),
    authController.devLogin
  );
} else {

  router.post('/dev-login', (_req, res) => {
    res.status(403).json({ success: false, message: 'Dev login is disabled in this environment.' });
  });
}

router.post(
  '/password/change',
  authMiddleware,
  validate([
    body('oldPassword').notEmpty().withMessage('Old password is required'),
    body('newPassword').isLength({ min: 4 }).withMessage('New password must be at least 4 characters long'),
  ]),
  authController.changePassword
);

router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
