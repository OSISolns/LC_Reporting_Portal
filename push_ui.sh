#!/bin/bash
git add frontend/src/pages/DailyInventoryCheckup.jsx backend/src/controllers/clinicalController.js frontend/src/pages/DailyOperationalReportBoard.jsx
git commit -m "fix: prevent duplicate audit logs from stock carry-over ripple effects, format stock/consumed columns, and simplify ward badge"
git push
