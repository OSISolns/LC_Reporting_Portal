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

    await DailyReport.saveDaily(report_date, metrics, logs);
    await logAction(req, 'SAVE', 'daily_operational_report', null, { date: report_date, metricsCount: metrics.length, logsCount: logs.length });

    res.json({ success: true, message: `Daily report for ${report_date} saved successfully.` });
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

