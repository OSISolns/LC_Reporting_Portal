require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const { rows } = await client.execute("SELECT u.username, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = 'chef_nurse_clara'");
  console.log('User Role:', rows);
  
  const { rows: perms } = await client.execute("SELECT * FROM role_permissions WHERE role_name = 'chef-nurse'");
  console.log("Perm count for chef-nurse:", perms.length);

  const { rows: perms2 } = await client.execute("SELECT * FROM role_permissions WHERE role_name = 'chef_nurse'");
  console.log("Perm count for chef_nurse:", perms2.length);

  process.exit(0);
}
main();
