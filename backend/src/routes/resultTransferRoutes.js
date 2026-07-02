'use strict';
const express = require('express');
const router = express.Router();
const controller = require('../controllers/resultTransferController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');
const { validate, body, param } = require('../middleware/validation');

router.use(authMiddleware);

// GET all requests
router.get(
  '/', 
  checkPermission('results_transfer', 'view'), 
  controller.getAllRequests
);
 
// GET single request
router.get(
  '/:id', 
  checkPermission('results_transfer', 'view'), 
  controller.getRequestById
);

// POST create request
router.post(
  '/', 
  checkPermission('results_transfer', 'create'), 
  validate([
    body('transferDate').isDate().withMessage('Valid transfer date is required'),
    body('oldSid').trim().notEmpty().withMessage('Old SID number is required'),
    body('newSid').trim().notEmpty().withMessage('New SID number is required'),
    body('reason').trim().notEmpty().withMessage('Reason for transfer is required'),
  ]),
  controller.createRequest
);

// PUT review request
router.put(
  '/:id/review', 
  checkPermission('results_transfer', 'review'), 
  controller.reviewRequest
);

// PUT approve request
router.put(
  '/:id/approve',
  checkPermission('results_transfer', 'approve'),
  validate([
    body('editedByName').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).escape(),
  ]),
  controller.approveRequest
);

// PUT reject request
router.put(
  '/:id/reject',
  checkPermission('results_transfer', 'reject'),
  validate([
    body('comment').trim().notEmpty().withMessage('Rejection comment is required').isLength({ max: 1000 }),
  ]),
  controller.rejectRequest
);

// DELETE request
router.delete(
  '/:id', 
  checkPermission('results_transfer', 'delete'), 
  controller.deleteRequest
);

router.get('/:id/pdf', checkPermission('results_transfer', 'view'), controller.getPDF);

module.exports = router;
