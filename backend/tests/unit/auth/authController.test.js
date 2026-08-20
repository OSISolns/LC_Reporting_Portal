'use strict';

const authController = require('../../../src/controllers/authController');
const User = require('../../../src/models/user');
const bcrypt = require('bcryptjs');

jest.mock('../../../src/models/user');
jest.mock('bcryptjs');
jest.mock('../../../src/middleware/audit', () => ({
  logAction: jest.fn().mockResolvedValue(true)
}));
jest.mock('../../../src/utils/crypto', () => ({
  decryptField: (val) => val
}));
jest.mock('../../../src/models/permission', () => ({
  getEffectivePermissions: jest.fn().mockResolvedValue({})
}));

describe('authController Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('login endpoint logic', () => {
    it('should return 400 if username or password is missing', async () => {
      req.body = { username: 'admin' };
      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Please provide username and password.' })
      );
    });

    it('should return 401 if user is not found or inactive', async () => {
      req.body = { username: 'unknown', password: 'password' };
      User.findByUsername.mockResolvedValue(null);

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Invalid credentials or inactive account.' })
      );
    });

    it('should return 403 if user account is locked', async () => {
      const lockTime = new Date(Date.now() + 5 * 60000).toISOString();
      req.body = { username: 'lockeduser', password: 'password' };
      User.findByUsername.mockResolvedValue({
        id: 1,
        username: 'lockeduser',
        is_active: 1,
        lockout_until: lockTime,
      });

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('temporarily locked') })
      );
    });

    it('should return 401 on incorrect password and increment failed attempts', async () => {
      req.body = { username: 'testuser', password: 'wrongpassword' };
      User.findByUsername.mockResolvedValue({
        id: 10,
        username: 'testuser',
        is_active: 1,
        password_hash: 'hashedpassword',
        failed_attempts: 0
      });
      bcrypt.compare.mockResolvedValue(false);
      User.incrementFailedAttempts.mockResolvedValue(1);

      await authController.login(req, res, next);

      expect(User.incrementFailedAttempts).toHaveBeenCalledWith(10);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Invalid credentials.' })
      );
    });

    it('should return 200 and token on valid credentials', async () => {
      req.body = { username: 'admin', password: 'validpassword' };
      User.findByUsername.mockResolvedValue({
        id: 1,
        full_name: 'Admin User',
        username: 'admin',
        email: 'admin@legacyclinics.rw',
        role: 'admin',
        is_active: 1,
        password_hash: 'hashed'
      });
      bcrypt.compare.mockResolvedValue(true);
      User.resetAttempts.mockResolvedValue();

      await authController.login(req, res, next);

      expect(User.resetAttempts).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: expect.any(String),
          user: expect.objectContaining({ username: 'admin', role: 'admin' })
        })
      );
    });
  });

  describe('devLogin endpoint logic', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      delete process.env.ALLOW_DEV_LOGIN;
    });

    it('should return 403 in production environment', async () => {
      process.env.NODE_ENV = 'production';
      req.body = { username: 'admin' };

      await authController.devLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Dev login is disabled in this environment.' })
      );
    });

    it('should return 403 if ALLOW_DEV_LOGIN is explicitly false', async () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_DEV_LOGIN = 'false';
      req.body = { username: 'admin' };

      await authController.devLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
