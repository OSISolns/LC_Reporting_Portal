'use strict';

const dailyReportController = require('../../src/controllers/dailyReportController');
const DailyReport = require('../../src/models/dailyReport');
const { logAction } = require('../../src/middleware/audit');

jest.mock('../../src/models/dailyReport');
jest.mock('../../src/middleware/audit', () => ({
  logAction: jest.fn().mockResolvedValue(true)
}));

describe('DailyReport Controller Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { id: 1, role: 'nurse' },
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('saveDaily', () => {
    it('should reject nurse user modifying past reports', async () => {
      req.user = { id: 1, role: 'nurse' };
      req.body = {
        report_date: '2020-01-01',
        metrics: [{ provider_id: 1, patient_count: 5 }],
        logs: [{ metric_name: 'Minor', metric_value: '2' }]
      };

      await dailyReportController.saveDaily(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Users are not authorized to modify past reports.'
      });
      expect(DailyReport.saveDaily).not.toHaveBeenCalled();
    });

    it('should reject doctor role modifying past reports', async () => {
      req.user = { id: 2, role: 'doctor' };
      req.body = {
        report_date: '2020-01-01',
        metrics: [],
        logs: []
      };

      await dailyReportController.saveDaily(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Users are not authorized to modify past reports.'
      });
      expect(DailyReport.saveDaily).not.toHaveBeenCalled();
    });

    it('should reject admin user modifying past reports', async () => {
      req.user = { id: 99, role: 'admin' };
      req.body = {
        report_date: '2020-01-01',
        metrics: [{ provider_id: 1, patient_count: 5 }],
        logs: [{ metric_name: 'Minor', metric_value: '2' }]
      };

      await dailyReportController.saveDaily(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Users are not authorized to modify past reports.'
      });
      expect(DailyReport.saveDaily).not.toHaveBeenCalled();
    });

    it('should allow user to save current/future daily reports', async () => {
      const dateObj = new Date();
      const offset = dateObj.getTimezoneOffset() * 60000;
      const todayStr = new Date(dateObj.getTime() - offset).toISOString().split('T')[0];

      req.user = { id: 1, role: 'nurse' };
      req.body = {
        report_date: todayStr,
        metrics: [{ provider_id: 1, patient_count: 5 }],
        logs: [{ metric_name: 'Minor', metric_value: '2' }]
      };
      DailyReport.saveDaily.mockResolvedValue({ success: true });

      await dailyReportController.saveDaily(req, res, next);

      expect(DailyReport.saveDaily).toHaveBeenCalledWith(
        todayStr,
        req.body.metrics,
        req.body.logs
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
