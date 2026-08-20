'use strict';

const checkPermission = require('../../../src/middleware/permission');
const { roleGuard } = require('../../../src/middleware/auth');
const Permission = require('../../../src/models/permission');

jest.mock('../../../src/models/permission');
jest.mock('../../../src/middleware/audit', () => ({
  logAction: jest.fn().mockResolvedValue(true)
}));

describe('RBAC & Permission Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null, originalUrl: '/api/test' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('roleGuard Middleware', () => {
    it('should deny access if user is missing', async () => {
      const guard = roleGuard(['admin', 'doctor']);
      await guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('Access denied') })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access if user role is not allowed', async () => {
      req.user = { id: 1, role: 'nurse' };
      const guard = roleGuard(['admin', 'doctor']);
      await guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() if user role is allowed', async () => {
      req.user = { id: 1, role: 'admin' };
      const guard = roleGuard(['admin', 'doctor']);
      await guard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('checkPermission Middleware', () => {
    it('should return 401 if req.user is unauthenticated', async () => {
      const middleware = checkPermission('incidents', 'view');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should prevent admin from performing L1 review on non-results_transfer modules', async () => {
      req.user = { id: 1, role: 'admin' };
      const middleware = checkPermission('cancellations', 'review');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Admins are not permitted to perform L1 verification.' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow admin to perform L1 review on results_transfer module', async () => {
      req.user = { id: 1, role: 'admin' };
      const middleware = checkPermission('results_transfer', 'review');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow admin full access for other actions', async () => {
      req.user = { id: 1, role: 'admin' };
      const middleware = checkPermission('cancellations', 'approve');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow medical_director access to allowed modules', async () => {
      req.user = { id: 2, role: 'medical_director' };
      const middleware = checkPermission('incident_reports', 'view');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should delegate to Permission.check for standard roles', async () => {
      req.user = { id: 5, role: 'nurse' };
      Permission.check.mockResolvedValue(true);

      const middleware = checkPermission('clinical_observation', 'create');
      await middleware(req, res, next);

      expect(Permission.check).toHaveBeenCalledWith(5, 'nurse', 'clinical_observation', 'create');
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when Permission.check returns false', async () => {
      req.user = { id: 5, role: 'nurse' };
      Permission.check.mockResolvedValue(false);

      const middleware = checkPermission('user_management', 'delete');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
