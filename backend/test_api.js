const http = require('http');

const data = JSON.stringify({ email: "noble@legacyclinics.rw", password: "password123" });

const req = http.request({
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const json = JSON.parse(body);
    if (!json.token) {
      console.log("Login failed", json);
      return;
    }
    console.log("Got token");
    http.get({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/clinical/prescriptions/completed',
      headers: { 'Authorization': `Bearer ${json.token}` }
    }, res2 => {
      let b2 = '';
      res2.on('data', d => b2 += d);
      res2.on('end', () => console.log("Response:", b2));
    });
  });
});
req.write(data);
req.end();
