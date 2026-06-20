#!/bin/bash
node scripts/restore_june_data.js
git add .
git commit -m "Standardize reporting metrics architecture to use specialization_id and backfill June data"
git push
