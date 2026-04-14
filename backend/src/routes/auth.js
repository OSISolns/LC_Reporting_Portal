'use strict';
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, body } = require('../middleware/validation');

const allowDevLogin = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_LOGIN !== 'false';

router.post(
  '/login',
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

router.get('/me', authenticate, authController.getMe);

module.exports = router;
