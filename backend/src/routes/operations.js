'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/operationsController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');
const { validate, body, param, query } = require('../middleware/validation');

router.use(authMiddleware);

// ── Summary / Dashboard ───────────────────────────────────────────────────────
router.get('/summary', checkPermission('operations', 'view'), ctrl.getSummary);

// ── Facility Task Logs ────────────────────────────────────────────────────────

/** GET /api/operations/tasks/today — current user's log for today */
router.get('/tasks/today', checkPermission('operations', 'view'), ctrl.getTodayLog);

/** GET /api/operations/tasks — all logs (management view) */
router.get(
  '/tasks',
  checkPermission('operations', 'view'),
  validate([
    query('date_from').optional().isDate().withMessage('date_from must be YYYY-MM-DD'),
    query('date_to').optional().isDate().withMessage('date_to must be YYYY-MM-DD'),
    query('user_id').optional().isInt().withMessage('user_id must be an integer'),
  ]),
  ctrl.getAllLogs
);

/** GET /api/operations/tasks/:id */
router.get(
  '/tasks/:id',
  checkPermission('operations', 'view'),
  validate([param('id').isInt().withMessage('Invalid task log ID')]),
  ctrl.getLogById
);

/** POST /api/operations/tasks — create / upsert today's log */
router.post(
  '/tasks',
  checkPermission('operations', 'create'),
  validate([
    body('tasks_json').isArray().withMessage('tasks_json must be an array'),
    body('general_notes').optional({ nullable: true }).isString().isLength({ max: 5000 }),
    body('status').optional().isIn(['draft', 'submitted']).withMessage('Invalid status'),
  ]),
  ctrl.createLog
);

/** PATCH /api/operations/tasks/:id — update log */
router.patch(
  '/tasks/:id',
  checkPermission('operations', 'edit'),
  validate([
    param('id').isInt().withMessage('Invalid task log ID'),
    body('tasks_json').optional().isArray(),
    body('general_notes').optional({ nullable: true }).isString().isLength({ max: 5000 }),
    body('status').optional().isIn(['draft', 'submitted']),
  ]),
  ctrl.updateLog
);

/** DELETE /api/operations/tasks/:id — admin only */
router.delete(
  '/tasks/:id',
  checkPermission('operations', 'delete'),
  validate([param('id').isInt().withMessage('Invalid task log ID')]),
  ctrl.deleteLog
);

module.exports = router;
