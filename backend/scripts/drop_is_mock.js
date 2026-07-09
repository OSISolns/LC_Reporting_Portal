'use strict';

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Determine database path
const dbPath = path.resolve(__dirname, '../database/database.sqlite');
console.log('Connecting to database at:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file does not exist!');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 1. Get all tables
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], async (err, tables) => {
    if (err) {
      console.error('Error fetching tables:', err);
      db.close();
      process.exit(1);
    }

    console.log(`Found ${tables.length} tables. Checking for 'is_mock' column...`);
    
    let processed = 0;
    let droppedCount = 0;

    for (const table of tables) {
      const tableName = table.name;
      db.all(`PRAGMA table_info(${tableName})`, [], (pragmaErr, columns) => {
        if (pragmaErr) {
          console.error(`Error fetching pragma for ${tableName}:`, pragmaErr);
          return;
        }

        const hasIsMock = columns.some(col => col.name === 'is_mock');
        if (hasIsMock) {
          console.log(`Table '${tableName}' has 'is_mock' column. Dropping it...`);
          db.run(`ALTER TABLE ${tableName} DROP COLUMN is_mock`, (alterErr) => {
            if (alterErr) {
              console.error(`❌ Failed to drop column from '${tableName}':`, alterErr.message);
            } else {
              console.log(`✅ Dropped 'is_mock' from table '${tableName}'`);
              droppedCount++;
            }
            checkFinished();
          });
        } else {
          checkFinished();
        }
      });
    }

    function checkFinished() {
      processed++;
      if (processed === tables.length) {
        console.log(`\n🎉 Finished processing all tables! Successfully dropped 'is_mock' from ${droppedCount} tables.`);
        db.close();
      }
    }
  });
});
