const app = require('../api/index');
const http = require('http');

const server = http.createServer(app);
server.listen(3099, async () => {
  console.log('Test server running on 3099');

  try {
    const res = await fetch('http://localhost:3099/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.error('Test fetch error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
