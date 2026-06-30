'use strict';
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '../database/database.sqlite');
const destPath = path.resolve(__dirname, '../database/database_encrypted.sqlite');
const encryptionKey = process.env.DB_ENCRYPTION_KEY || 'legacy_clinics_secure_prisma_encryption_key_2026';

async function run() {
  try {
    console.log('🏁 Starting Database Encryption & Migration Process...');
    console.log('Source DB:', srcPath);
    console.log('Destination DB:', destPath);

    if (!fs.existsSync(srcPath)) {
      console.error('❌ Source database file does not exist!');
      process.exit(1);
    }

    // Check if the source database is already encrypted by reading the first 16 bytes
    const fd = fs.openSync(srcPath, 'r');
    const headerBuffer = Buffer.alloc(16);
    fs.readSync(fd, headerBuffer, 0, 16, 0);
    fs.closeSync(fd);

    const header = headerBuffer.toString('utf8');
    if (!header.startsWith('SQLite format 3')) {
      console.log('🔒 Database file does not have SQLite header. It is likely already encrypted.');
      console.log('✨ Nothing to do.');
      return;
    }

    console.log('🔓 Source database is unencrypted. Initializing clients...');

    // Initialize source client (no encryption key)
    const srcClient = createClient({
      url: `file:${srcPath}`
    });

    // Clean up old destination if it exists
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
    if (fs.existsSync(destPath + '-shm')) fs.unlinkSync(destPath + '-shm');
    if (fs.existsSync(destPath + '-wal')) fs.unlinkSync(destPath + '-wal');

    // Initialize destination client (with encryption key)
    const destClient = createClient({
      url: `file:${destPath}`,
      encryptionKey: encryptionKey
    });

    // Disable foreign key checks on both sides to allow out-of-order inserts
    await srcClient.execute('PRAGMA foreign_keys = OFF;');
    await destClient.execute('PRAGMA foreign_keys = OFF;');

    // 1. Fetch tables, indexes, and triggers from source
    console.log('📋 Fetching schema definitions...');
    const { rows: schemaItems } = await srcClient.execute(
      "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"
    );

    // Filter tables, indexes, and triggers
    const tables = schemaItems.filter(item => item.type === 'table');
    const indexes = schemaItems.filter(item => item.type === 'index');
    const triggers = schemaItems.filter(item => item.type === 'trigger');

    console.log(`Found ${tables.length} tables, ${indexes.length} indexes, ${triggers.length} triggers.`);

    // 2. Create tables in destination
    console.log('🧱 Recreating tables in encrypted database...');
    for (const table of tables) {
      console.log(`  -> Creating table "${table.name}"`);
      await destClient.execute(table.sql);
    }

    // 3. Copy rows for each table
    console.log('🚚 Copying data row-by-row...');
    for (const table of tables) {
      console.log(`  -> Migrating data for table "${table.name}"`);
      
      // Fetch total row count
      const countRes = await srcClient.execute(`SELECT COUNT(*) as count FROM "${table.name}"`);
      const totalRows = countRes.rows[0].count;
      console.log(`     Total rows: ${totalRows}`);

      if (totalRows === 0) continue;

      // Fetch column names for this table
      const infoRes = await srcClient.execute(`PRAGMA table_info("${table.name}")`);
      const columns = infoRes.rows.map(r => r.name);
      
      const colList = columns.map(c => `"${c}"`).join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      const insertSql = `INSERT INTO "${table.name}" (${colList}) VALUES (${placeholders})`;

      // Migrate in batches of 1000 to keep memory usage low
      const batchSize = 1000;
      for (let offset = 0; offset < totalRows; offset += batchSize) {
        const { rows } = await srcClient.execute(
          `SELECT * FROM "${table.name}" LIMIT ${batchSize} OFFSET ${offset}`
        );

        const statements = rows.map(row => {
          const args = columns.map(col => {
            const val = row[col];
            // Normalize bigints to numbers
            if (typeof val === 'bigint') return Number(val);
            return val === undefined ? null : val;
          });
          return { sql: insertSql, args };
        });

        // Run batch write in destination
        await destClient.batch(statements);
        console.log(`     Progress: ${Math.min(offset + batchSize, totalRows)}/${totalRows} rows migrated`);
      }
    }

    // 4. Create indexes
    console.log('⚡ Recreating indexes...');
    for (const index of indexes) {
      console.log(`  -> Creating index "${index.name}"`);
      await destClient.execute(index.sql).catch(err => {
        // Safe to ignore if index was automatically created by constraint
        if (!err.message.includes('already exists')) {
          console.warn(`     Warning creating index ${index.name}:`, err.message);
        }
      });
    }

    // 5. Create triggers
    console.log('⚙️ Recreating triggers...');
    for (const trigger of triggers) {
      console.log(`  -> Creating trigger "${trigger.name}"`);
      await destClient.execute(trigger.sql).catch(err => {
        console.warn(`     Warning creating trigger ${trigger.name}:`, err.message);
      });
    }

    // Re-enable foreign key checks on destination
    await destClient.execute('PRAGMA foreign_keys = ON;');

    console.log('✅ Data migration complete! Swapping database files...');
    
    // Close clients before file swap
    // (createClient does not require explicit close, but letting event loop finish ensures handles are cleared)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Backup original database
    const backupPath = srcPath + '.unencrypted.bak';
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    if (fs.existsSync(backupPath + '-shm')) fs.unlinkSync(backupPath + '-shm');
    if (fs.existsSync(backupPath + '-wal')) fs.unlinkSync(backupPath + '-wal');

    fs.renameSync(srcPath, backupPath);
    if (fs.existsSync(srcPath + '-shm')) fs.renameSync(srcPath + '-shm', backupPath + '-shm');
    if (fs.existsSync(srcPath + '-wal')) fs.renameSync(srcPath + '-wal', backupPath + '-wal');

    // Move encrypted to original path
    fs.renameSync(destPath, srcPath);
    if (fs.existsSync(destPath + '-shm')) fs.renameSync(destPath + '-shm', srcPath + '-shm');
    if (fs.existsSync(destPath + '-wal')) fs.renameSync(destPath + '-wal', srcPath + '-wal');

    console.log('🎉 SUCCESS: Database encrypted and replaced successfully.');
    console.log(`💾 Original unencrypted database backed up to: ${backupPath}`);
  } catch (err) {
    console.error('❌ Migration script failed:', err);
    process.exit(1);
  }
}

run();
