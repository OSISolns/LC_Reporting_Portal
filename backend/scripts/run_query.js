const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const db = require('../src/config/db');

async function run() {
  const logPath = path.join(__dirname, '../../query_log.txt');
  try {
    fs.writeFileSync(logPath, "Starting query...\n");
    const { rows } = await db.query("SELECT * FROM departments");
    fs.appendFileSync(logPath, `Query success! Found ${rows.length} departments.\n`);
    fs.appendFileSync(logPath, JSON.stringify(rows, null, 2) + "\n");
    console.log("Success");
    process.exit(0);
  } catch (error) {
    fs.appendFileSync(logPath, `Query error: ${error.message}\n${error.stack}\n`);
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
