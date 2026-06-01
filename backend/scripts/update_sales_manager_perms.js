'use strict';
const db = require('../src/config/db');

async function run() {
  try {
    console.log('🔄 Updating Sales Manager role permissions for refunds and cancellations...');

    const actions = ['review', 'approve', 'reject', 'view'];
    const modules = ['cancellations', 'refunds'];

    for (const moduleName of modules) {
      for (const actionName of actions) {
        await db.query(
          `INSERT INTO role_permissions (role_name, module, action, granted, updated_by, updated_at)
           VALUES ('sales_manager', ?, ?, 1, 1, CURRENT_TIMESTAMP)
           ON CONFLICT(role_name, module, action) DO UPDATE 
           SET granted = 1, updated_at = CURRENT_TIMESTAMP`,
          [moduleName, actionName]
        );
        console.log(`✅ Granted '${actionName}' in '${moduleName}' to 'sales_manager'`);
      }
    }

    console.log('🎉 Database permission updates completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('💥 Error updating permissions:', err);
    process.exit(1);
  }
}

run();
