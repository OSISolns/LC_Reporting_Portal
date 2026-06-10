#!/bin/bash
DB="reporting-1.db"
OUT="backup_overview.md"

echo "# Backup Database Overview (reporting-1.db)" > $OUT
echo "" >> $OUT

for table in $(sqlite3 $DB "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"); do
  count=$(sqlite3 $DB "SELECT COUNT(*) FROM $table;")
  echo "## Table: $table ($count rows)" >> $OUT
  if [ "$count" -gt 0 ]; then
    sqlite3 -markdown $DB "SELECT * FROM $table LIMIT 3;" >> $OUT 2>/dev/null || sqlite3 -header -column $DB "SELECT * FROM $table LIMIT 3;" >> $OUT
  fi
  echo "" >> $OUT
done
