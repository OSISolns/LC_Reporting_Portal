
const bcrypt = require('bcryptjs');

async function testPassword() {
  const password = 'password123';
  const hash = '$2a$10$DRjZv3N/1d8UWv4xRVuL1e9A95QCd9rm38hbdsmXs8eVaajEJzGN2';
  const match = await bcrypt.compare(password, hash);
  console.log('Password match:', match);
}

testPassword();
