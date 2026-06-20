const db = require('./src/config/db');

async function test() {
  try {
    await db.client.execute("ALTER TABLE providers ADD COLUMN specialization TEXT");
    console.log("✅ Added successfully");
  } catch(e) {
    console.log("❌ Failed:", e.message);
  }
}

test();
