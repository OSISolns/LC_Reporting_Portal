const { client } = require('../backend/src/config/db');

async function testRoles() {
  console.log('Inserting/updating Physiotherapy roles in SQLite database...');
  
  const physioRoles = [
    { name: 'physio_manager', display_name: 'Physiotherapy Manager' },
    { name: 'physio',         display_name: 'Physiotherapist' },
  ];

  for (const r of physioRoles) {
    await client.execute({
      sql: `INSERT INTO roles (name, display_name) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET display_name = EXCLUDED.display_name`,
      args: [r.name, r.display_name],
    });
  }

  const res = await client.execute({
    sql: "SELECT id, name, display_name FROM roles WHERE name IN ('physio_manager', 'physio')",
    args: []
  });

  console.log('✅ Found roles in database:', res.rows);
  if (res.rows.length >= 2) {
    console.log('🎉 SUCCESS: Both Physiotherapy Manager and Physiotherapist roles have been created in the database!');
  } else {
    console.error('❌ Failed to find both roles.');
  }
  process.exit(0);
}

testRoles().catch(err => {
  console.error('Error during role verification:', err);
  process.exit(1);
});
