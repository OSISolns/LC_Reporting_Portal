const User = require('./src/models/user');

async function resetPasswords() {
  try {
    const nurses = [94, 129]; // lc_nurse, lc_joyce
    for (const id of nurses) {
      await User.resetPassword(id, 'Legacy123!');
      console.log(`Password reset for user ID ${id}`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resetPasswords();
