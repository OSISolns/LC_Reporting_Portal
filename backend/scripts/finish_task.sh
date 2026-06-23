#!/bin/bash
git add .
git commit -m "feat(db): implement dynamic dual-driver architecture connecting to native Turso (@libsql/client) in production to bypass Prisma TIMESTAMPTZ SQLite metadata crash"
git push
