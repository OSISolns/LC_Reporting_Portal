'use strict';
const StaffPerformance = require('../models/staffPerformance');
const Notification = require('../models/notification');
const User = require('../models/user');
const { logAction } = require('../middleware/audit');

// ── Scores ────────────────────────────────────────────────────────────────────

exports.getAllScores = async (req, res, next) => {
  try {
    const scores = await StaffPerformance.getAllScores();
    res.json({ success: true, data: scores });
  } catch (err) { next(err); }
};

exports.getMyScore = async (req, res, next) => {
  try {
    const score = await StaffPerformance.getScoreByUserId(req.user.id);
    const ratings = await StaffPerformance.getRatingsForStaff(req.user.id, 10);
    res.json({ success: true, data: { score, ratings } });
  } catch (err) { next(err); }
};

// ── Ratings ───────────────────────────────────────────────────────────────────

exports.getAllRatings = async (req, res, next) => {
  try {
    const ratings = await StaffPerformance.getAllRatings();
    res.json({ success: true, data: ratings });
  } catch (err) { next(err); }
};

exports.getRatingsForStaff = async (req, res, next) => {
  try {
    const ratings = await StaffPerformance.getRatingsForStaff(req.params.userId);
    res.json({ success: true, data: ratings });
  } catch (err) { next(err); }
};

exports.getSeverityStats = async (req, res, next) => {
  try {
    const stats = await StaffPerformance.getSeverityStats();
    const scores = await StaffPerformance.getAllScores();
    res.json({ success: true, data: { stats, scores } });
  } catch (err) { next(err); }
};

// ── Submit rating ─────────────────────────────────────────────────────────────

exports.submitRating = async (req, res, next) => {
  try {


    const { staffUserId, requestType, requestId, reason, severity, note } = req.body;

    if (!staffUserId || !requestType || !reason || !severity) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const { rating, newScore, newWarnings, pointsDeducted, isSev2Warning, sev2Deduction } = await StaffPerformance.applyRating({
      staffUserId,
      ratedBy: req.user.id,
      requestType,
      requestId: requestId || null,
      reason,
      severity,
      note,
    });

    // Audit
    try {
      await logAction(req, 'RATE', 'staff_performance', staffUserId, { severity, pointsDeducted });
    } catch (e) {}

    // Notify the staff member
    try {
      const staffUser = await User.findById(staffUserId);
      if (staffUser) {
        let notifTitle, notifMessage, notifType;

        if (severity <= 2) {
          if (isSev2Warning && sev2Deduction > 0) {
            notifTitle = '🔴 Performance Deduction & Warning (Severity 2 Limit)';
            notifMessage = `You received multiple severity 2 ratings. This has triggered both a warning and a ${pointsDeducted} point deduction. Your score is ${Number(newScore).toFixed(1)}/100.`;
            notifType = 'error';
          } else if (isSev2Warning) {
            notifTitle = '⚠️ Performance Warning (Severity 2 Accumulation)';
            notifMessage = `You have received a warning due to accumulating 3 severity 2 ratings. Total warnings: ${newWarnings}.`;
            notifType = 'warning';
          } else if (sev2Deduction > 0) {
            notifTitle = '🔴 Performance Deduction (Severity 2 Limit)';
            notifMessage = `You have accumulated 5 severity 2 ratings. 0.5 points have been deducted. Your score is ${Number(newScore).toFixed(1)}/100.`;
            notifType = 'error';
          } else {
            notifTitle = 'Performance Note';
            notifMessage = `Your ${requestType} for "${reason}" was rated as tolerable (Severity ${severity}/10). Keep up the good work!`;
            notifType = 'info';
          }
        } else if (severity === 3) {
          if (pointsDeducted > 0) {
            notifTitle = '🔴 Performance Deduction (Warning Limit Reached)';
            notifMessage = `You received a warning regarding your ${requestType}: "${reason}". Since this is warning #${newWarnings}, 0.5 performance points have been automatically deducted. Your current score is ${Number(newScore).toFixed(1)}/100.`;
            notifType = 'error';
          } else {
            notifTitle = '⚠️ Performance Warning';
            notifMessage = `You have received a warning regarding your ${requestType}: "${reason}". This is recorded on your performance profile. Total warnings: ${newWarnings}.`;
            notifType = 'warning';
          }
        } else {
          notifTitle = '🔴 Performance Deduction';
          notifMessage = `${pointsDeducted} performance point(s) were deducted for: "${reason}" (Severity ${severity}/10). Your current score is ${Number(newScore).toFixed(1)}/100.`;
          notifType = 'error';
        }

        await Notification.create({
          userId: staffUserId,
          title: notifTitle,
          message: notifMessage,
          type: notifType,
          link: '/performance',
        });
      }
    } catch (e) {
      console.error('Performance notification error:', e);
    }

    res.status(201).json({
      success: true,
      data: { rating, newScore, newWarnings, pointsDeducted },
    });
  } catch (err) { 
    if (err.message === 'This request has already been rated.') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err); 
  }
};

exports.getUnratedRequests = async (req, res, next) => {
  try {
    const { staffId, type } = req.query;
    if (!staffId || !type) {
       return res.status(400).json({ success: false, message: 'staffId and type required' });
    }
    const requests = await StaffPerformance.getUnratedRequests(staffId, type);
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
};
