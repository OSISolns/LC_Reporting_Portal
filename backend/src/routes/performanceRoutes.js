'use strict';
const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/performanceController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission   = require('../middleware/permission');
const StaffPerformance   = require('../models/staffPerformance');

// Bootstrap DB tables on first load (idempotent)
StaffPerformance.bootstrap().catch(err =>
  console.error('⚠️  Performance table bootstrap error:', err.message)
);

router.use(authMiddleware);

router.get('/scores',             checkPermission('staff_performance', 'view'), ctrl.getAllScores);
router.get('/ratings',            checkPermission('staff_performance', 'view'), ctrl.getAllRatings);
router.get('/ratings/:userId',    checkPermission('staff_performance', 'view'), ctrl.getRatingsForStaff);
router.get('/unrated-requests',   checkPermission('staff_performance', 'create'), ctrl.getUnratedRequests);
router.get('/stats',              checkPermission('staff_performance', 'view'), ctrl.getSeverityStats);
router.post('/rate',              checkPermission('staff_performance', 'create'), ctrl.submitRating);

// Any authenticated staff member can view their own score
router.get('/my-score', ctrl.getMyScore);

module.exports = router;
