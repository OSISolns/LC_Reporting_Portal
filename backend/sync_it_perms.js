const Permission = require('./src/models/permission');
const { client } = require('./src/config/db');

async function sync() {
  try {
    console.log('🔄 Syncing IT Officer permissions to new system defaults...');
    
    // We assume ID 1 is the primary admin (Valery)
    const adminId = 1; 
    
    // Reset it_officer to new defaults defined in config/permissions.js
    await Permission.resetRolePermissions('it_officer', adminId);
    
    console.log('✅ IT Officer permissions synchronized.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  }
}

sync();
