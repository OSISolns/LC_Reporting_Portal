'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.resolve(__dirname, 'database/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], (err, tables) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    let checked = 0;
    const tablesWithIsMock = [];

    for (const table of tables) {
      const name = table.name;
      db.all(`PRAGMA table_info(${name})`, [], (pragmaErr, columns) => {
        if (!pragmaErr) {
          if (columns.some(col => col.name === 'is_mock')) {
            tablesWithIsMock.push(name);
          }
        }
        checked++;
        if (checked === tables.length) {
          console.log('Tables containing is_mock:', tablesWithIsMock);
          db.close();
        }
      });
    }
  });
});
