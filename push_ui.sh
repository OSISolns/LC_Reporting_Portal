#!/bin/bash
# Staging all code updates, scripts, and configurations
git add -A

# Commit with a descriptive message
git commit -m "feat: support medical director, secure feedbacks, migrate db config to sqlite, and lock completed clinical sheets"

# Push to origin
git push
