const axios = require('axios');

async function run() {
  try {
    const res = await axios.get('http://41.173.250.126:8081/Legacy/forms/fm_login.aspx', { timeout: 5000 });
    console.log('STATUS:', res.status);
    console.log('BODY LENGTH:', res.data.length);
    console.log('BODY CONTAINS LOGIN:', res.data.includes('UserName') || res.data.includes('txtUserName'));
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
  process.exit(0);
}

run();
