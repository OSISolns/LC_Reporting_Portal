'use strict';
const express = require('express');
const router  = express.Router();
const shift   = require('../controllers/shiftController');
const { authMiddleware } = require('../middleware/auth');
const { validate, body, param, query } = require('../middleware/validation');

// All shift routes require authentication
router.use(authMiddleware);

// ─── Role guard: reviewer-only endpoints ──────────────────────────────────────
const REVIEWER_ROLES = ['principal_cashier', 'sales_manager', 'deputy_coo', 'coo', 'admin', 'quality_assurance', 'it_officer'];

function requireReviewer(req, res, next) {
  if (!REVIEWER_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access restricted to management roles.' });
  }
  next();
}

// ─── Staff endpoints ──────────────────────────────────────────────────────────

/**
 * POST /api/shifts/open
 * Open a new shift. Must select role: cashier | helpdesk | call_center
 */
router.post(
  '/open',
  validate([
    body('shift_role')
      .isIn(['cashier', 'helpdesk', 'call_center'])
      .withMessage('shift_role must be cashier, helpdesk, or call_center'),
    body('equipment')
      .isArray({ min: 1 })
      .withMessage('Equipment checklist is required'),
    body('equipment.*.name').notEmpty().withMessage('Equipment name is required'),
    body('equipment.*.status')
      .isIn(['Working', 'Needs Repair', 'Broken/Missing'])
      .withMessage('Invalid equipment status'),
  ]),
  shift.openShift
);

/**
 * GET /api/shifts/my-active
 * Get the current user's open/draft shift.
 */
router.get('/my-active', shift.getMyActiveShift);

/**
 * PATCH /api/shifts/:id/draft
 * Auto-save draft of closing data.
 */
router.patch(
  '/:id/draft',
  validate([param('id').isInt().withMessage('Invalid shift ID')]),
  shift.saveDraft
);

/**
 * PATCH /api/shifts/:id/close
 * Finalise and close the shift.
 */
router.patch(
  '/:id/close',
  validate([
    param('id').isInt().withMessage('Invalid shift ID'),
    body('handover_notes').trim().notEmpty().withMessage('Handover notes are required to close a shift'),
    body('equipment').isArray({ min: 1 }).withMessage('Closing equipment checklist is required'),
  ]),
  shift.closeShift
);

// ─── Reviewer / Management endpoints ─────────────────────────────────────────

/**
 * GET /api/shifts
 * List all shifts — management only.
 * Filters: role, date_from, date_to, employee_name, status, flagged, page, limit
 */
router.get(
  '/',
  requireReviewer,
  validate([
    query('role').optional().isIn(['cashier', 'helpdesk', 'call_center']),
    query('status').optional().isIn(['open', 'draft', 'closed']),
    query('flagged').optional().isIn(['0', '1']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  shift.getAllShifts
);

/**
 * GET /api/shifts/:id
 * Get full detail for a single shift.
 */
router.get(
  '/:id',
  validate([param('id').isInt().withMessage('Invalid shift ID')]),
  shift.getShiftById
);

/**
 * PATCH /api/shifts/:id/review
 * Mark a closed shift as reviewed — management only.
 */
router.patch(
  '/:id/review',
  requireReviewer,
  validate([param('id').isInt().withMessage('Invalid shift ID')]),
  shift.markReviewed
);

/**
 * Bulk review multiple shifts at once — management only.
 */
router.post(
  '/bulk-review',
  requireReviewer,
  validate([body('ids').isArray({ min: 1 }).withMessage('IDs must be an array')]),
  shift.bulkReview
);

/**
 * PATCH /api/shifts/:id/reactivate
 * Reopen a closed shift — admin and deputy_coo only.
 */
router.patch(
  '/:id/reactivate',
  (req, res, next) => {
    if (!['admin', 'deputy_coo'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access restricted to supervisors.' });
    }
    next();
  },
  validate([param('id').isInt().withMessage('Invalid shift ID')]),
  shift.reactivateShift
);

/**
 * Update any shift detail — admin and deputy_coo only.
 */
router.patch(
  '/:id/admin-update',
  (req, res, next) => {
    if (!['admin', 'deputy_coo'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access restricted to supervisors.' });
    }
    next();
  },
  validate([param('id').isInt().withMessage('Invalid shift ID')]),
  shift.updateShiftByAdmin
);

/**
 * Delete a shift — admin only.
 */
router.delete(
  '/:id',
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only system administrators can delete shift records.' });
    }
    next();
  },
  validate([param('id').isInt().withMessage('Invalid shift ID')]),
  shift.deleteShift
);

/**
 * Manually trigger the auto-close job — admin only.
 */
router.post(
  '/admin/auto-close',
  (req, res, next) => {
    if (!['admin', 'deputy_coo'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access restricted to administrators.' });
    }
    next();
  },
  async (req, res, next) => {
    try {
      const count = await shift.autoCloseExpiredShifts();
      res.json({
        success: true,
        message: count > 0
          ? `Auto-close complete. ${count} shift(s) were force-closed.`
          : 'No expired shifts found.',
        count,
      });
    } catch (err) { next(err); }
  }
);

// ─── Schedule: run auto-close every 15 minutes ───────────────────────────────
const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
setInterval(() => {
  shift.autoCloseExpiredShifts().then(n => {
    if (n > 0) console.log(`[ShiftPolicy] Scheduled run: ${n} shift(s) auto-closed`);
  });
}, INTERVAL_MS);

// Run once immediately on startup (catches any overnight orphans)
shift.autoCloseExpiredShifts().then(n => {
  if (n > 0) console.log(`[ShiftPolicy] Startup check: ${n} expired shift(s) auto-closed`);
});

module.exports = router;
