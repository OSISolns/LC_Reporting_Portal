'use strict';
const fs = require('fs');
const path = require('path');
const db = require('./backend/src/config/db');

async function migrate() {
    console.log('🚀 Starting Results Transfer migration...');
    try {
        const sqlPath = path.join(__dirname, 'database', 'results_transfer_migration.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split by semicolon but ignore inside quotes/functions if possible
        // For simplicity, we can run the whole block if the driver supports multiple statements
        // Turso/LibSQL execute handles multiple statements in some contexts, or we split.
        
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);
            
        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await db.query(statement);
        }
        
        console.log('✅ Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
