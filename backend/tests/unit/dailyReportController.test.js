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
    it('should reject non-admin user modifying past reports when restriction setting is ON', async () => {
      DailyReport.getSetting.mockResolvedValue('true');
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

    it('should allow non-admin user modifying past reports when restriction setting is OFF', async () => {
      DailyReport.getSetting.mockResolvedValue('false');
      DailyReport.saveDaily.mockResolvedValue({ success: true });
      req.user = { id: 1, role: 'nurse' };
      req.body = {
        report_date: '2020-01-01',
        metrics: [{ provider_id: 1, patient_count: 5 }],
        logs: [{ metric_name: 'Minor', metric_value: '2' }]
      };

      await dailyReportController.saveDaily(req, res, next);

      expect(DailyReport.saveDaily).toHaveBeenCalledWith(
        '2020-01-01',
        req.body.metrics,
        req.body.logs
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should allow admin user to modify past reports regardless of setting', async () => {
      DailyReport.getSetting.mockResolvedValue('true');
      req.user = { id: 99, role: 'admin' };
      req.body = {
        report_date: '2020-01-01',
        metrics: [{ provider_id: 1, patient_count: 5 }],
        logs: [{ metric_name: 'Minor', metric_value: '2' }]
      };
      DailyReport.saveDaily.mockResolvedValue({ success: true });

      await dailyReportController.saveDaily(req, res, next);

      expect(DailyReport.saveDaily).toHaveBeenCalledWith(
        '2020-01-01',
        req.body.metrics,
        req.body.logs
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('getSettings & updateSettings', () => {
    it('should return report settings', async () => {
      DailyReport.getSetting.mockResolvedValue('true');

      await dailyReportController.getSettings(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { restrict_past_daily_reports: true }
      });
    });

    it('should block non-admin users from updating settings', async () => {
      req.user = { id: 1, role: 'nurse' };
      req.body = { restrict_past_daily_reports: false };

      await dailyReportController.updateSettings(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(DailyReport.setSetting).not.toHaveBeenCalled();
    });

    it('should allow admin users to update report settings', async () => {
      req.user = { id: 99, role: 'admin' };
      req.body = { restrict_past_daily_reports: false };
      DailyReport.setSetting.mockResolvedValue({ key: 'restrict_past_daily_reports', value: 'false' });
      DailyReport.getSetting.mockResolvedValue('false');

      await dailyReportController.updateSettings(req, res, next);

      expect(DailyReport.setSetting).toHaveBeenCalledWith('restrict_past_daily_reports', 'false');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { restrict_past_daily_reports: false }
        })
      );
    });
  });
});
