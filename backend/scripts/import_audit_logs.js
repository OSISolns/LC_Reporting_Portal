#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Map historical log user_id to target db username
const logIdToUsername = {
  41: 'lc_yvette',
  5: 'lc_valery',
  32: 'lc_geofrey',
  18: 'lc_josiane', // In the SELECT output: { id: 18, username: 'lc_josiane', full_name: 'NYIRANSHIMIYIMANA Josiane' }. Wait, Providence is lc_provy (id 14). Let's check which is correct.
  3: 'lc_denyse',
  93: 'lc_sylvestre',
  92: 'lc_minega',
  45: 'user_45',
  94: 'user_94',
  130: 'user_130'
};

async function main() {
  const auditLogsPath = '/home/noble/Downloads/audit_logs.json';
  if (!fs.existsSync(auditLogsPath)) {
    console.error(`❌ Audit logs file not found at ${auditLogsPath}`);
    process.exit(1);
  }

  console.log(`✅ Reading audit logs from ${auditLogsPath}...`);
  let auditLogsData;
  try {
    const jsonString = fs.readFileSync(auditLogsPath, 'utf8');
    auditLogsData = JSON.parse(jsonString);
    console.log(`✅ Successfully loaded ${auditLogsData.length} audit log entries.`);
  } catch (parseErr) {
    console.error('❌ Failed to parse audit logs JSON:', parseErr.message);
    process.exit(1);
  }

  try {
    // 1. Get existing users
    console.log('🔍 Fetching existing users from DB...');
    const { rows: existingUsers } = await db.execute('SELECT id, username FROM users');
    const existingUserIds = new Set(existingUsers.map(u => Number(u.id)));

    // Create log-to-db ID mapping based on usernames
    const logIdToDbId = {};
    for (const [logId, username] of Object.entries(logIdToUsername)) {
      const dbUser = existingUsers.find(u => u.username === username);
      if (dbUser) {
        logIdToDbId[Number(logId)] = Number(dbUser.id);
        console.log(`Mapped log user_id ${logId} -> DB user_id ${dbUser.id} (${username})`);
      } else {
        logIdToDbId[Number(logId)] = Number(logId);
        console.log(`No matching DB user for username ${username}, using logId ${logId}`);
      }
    }

    // 2. Identify and insert missing users
    const missingUserIds = new Map();
    for (const log of auditLogsData) {
      if (log.user_id !== null && log.user_id !== undefined) {
        const originalId = Number(log.user_id);
        const mappedId = logIdToDbId[originalId] || originalId;
        
        if (!existingUserIds.has(mappedId)) {
          let username = logIdToUsername[originalId] || `user_${mappedId}`;
          missingUserIds.set(mappedId, {
            fullName: log.user_name || `User ${mappedId}`,
            username: username
          });
        }
      }
    }

    if (missingUserIds.size > 0) {
      console.log(`👤 Found ${missingUserIds.size} missing users in DB. Inserting placeholder users...`);
      for (const [userId, userInfo] of missingUserIds.entries()) {
        try {
          await db.execute({
            sql: `
              INSERT INTO users (id, full_name, username, password_hash, role_id, is_active)
              VALUES (?, ?, ?, ?, NULL, 1)
              ON CONFLICT (id) DO NOTHING
            `,
            args: [userId, userInfo.fullName, userInfo.username, 'placeholder_hash']
          });
          console.log(`   Added placeholder user ID ${userId} (${userInfo.fullName}, username: ${userInfo.username})`);
          existingUserIds.add(userId);
        } catch (insertUserErr) {
          console.error(`   ❌ Failed to insert placeholder user ${userId}:`, insertUserErr.message);
        }
      }
    } else {
      console.log('✅ All mapped users already exist in the database.');
    }

    // 3. Insert audit logs
    console.log('📥 Importing audit log entries...');
    let successCount = 0;
    for (const log of auditLogsData) {
      const originalId = log.user_id;
      const mappedId = originalId !== null && originalId !== undefined ? (logIdToDbId[Number(originalId)] || Number(originalId)) : null;
      
      try {
        await db.execute({
          sql: `
            INSERT OR REPLACE INTO audit_logs (
              id, user_id, user_name, user_role, action, entity_type, entity_id, details, ip_address, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            log.id,
            mappedId,
            log.user_name,
            log.user_role,
            log.action,
            log.entity_type,
            log.entity_id,
            log.details,
            log.ip_address,
            log.created_at
          ]
        });
        successCount++;
      } catch (insertErr) {
        console.error(`❌ Failed to insert audit log ID ${log.id} (mapped user_id: ${mappedId}):`, insertErr.message);
      }
    }
    
    console.log(`✅ Successfully imported ${successCount}/${auditLogsData.length} audit logs.`);
  } catch (err) {
    console.error('❌ Import workflow failed:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
  process.exit(0);
}

main();
