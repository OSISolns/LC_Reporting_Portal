'use strict';
const DailyReport = require('../models/dailyReport');
const { logAction } = require('../middleware/audit');

exports.getConfig = async (req, res, next) => {
  try {
    const config = await DailyReport.getConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
};

exports.getByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter is required (YYYY-MM-DD)' });
    }
    const report = await DailyReport.getByDate(date);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

exports.saveDaily = async (req, res, next) => {
  try {
    const { report_date, metrics, logs } = req.body;
    if (!report_date || !Array.isArray(metrics) || !Array.isArray(logs)) {
      return res.status(400).json({ success: false, message: 'Invalid payload. Date, metrics, and logs arrays are required.' });
    }

    // Past daily report modification restriction
    const restrictPast = await DailyReport.getSetting('restrict_past_daily_reports', 'true');
    const isRestricted = restrictPast !== 'false' && restrictPast !== false && restrictPast !== '0';

    if (isRestricted) {
      const dateObj = new Date();
      const offset = dateObj.getTimezoneOffset() * 60000;
      const localToday = new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
      
      if (report_date < localToday) {
        return res.status(403).json({ success: false, message: 'Users are not authorized to modify past reports.' });
      }
    }

    await DailyReport.saveDaily(report_date, metrics, logs);
    await logAction(req, 'SAVE', 'daily_operational_report', null, { date: report_date, metricsCount: metrics.length, logsCount: logs.length });

    res.json({ success: true, message: `Daily report for ${report_date} saved successfully.` });
  } catch (err) {
    next(err);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    const val = await DailyReport.getSetting('restrict_past_daily_reports', 'true');
    const restrict_past_daily_reports = val === 'true' || val === true || val === '1';
    res.json({ success: true, data: { restrict_past_daily_reports } });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { restrict_past_daily_reports } = req.body;
    const valStr = restrict_past_daily_reports ? 'true' : 'false';
    await DailyReport.setSetting('restrict_past_daily_reports', valStr);
    await logAction(req, 'UPDATE', 'system_settings', null, { key: 'restrict_past_daily_reports', value: valStr });
    res.json({
      success: true,
      message: 'Settings updated successfully.',
      data: { restrict_past_daily_reports: restrict_past_daily_reports === true || restrict_past_daily_reports === 'true' }
    });
  } catch (err) {
    next(err);
  }
};

exports.getMonthly = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);

    const report = await DailyReport.getMonthlyData(currentYear, currentMonth);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

exports.getWeekly = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate parameters are required (YYYY-MM-DD)' });
    }
    const report = await DailyReport.getWeeklyData(startDate, endDate);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};


