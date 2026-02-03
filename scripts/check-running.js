const http = require('http');

console.log('🔍 Checking which applications are running...\n');

// Check port 3000 (IoT-QR-Consumer)
checkPort(3000, 'IoT-QR-Consumer (QR Scanner)');

// Check port 3001 (Other application)
checkPort(3001, 'Other Application (Production/Weighing)');

function checkPort(port, appName) {
  const req = http.get(`http://localhost:${port}`, (res) => {
    console.log(`✅ Port ${port} is running: ${appName}`);
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   URL: http://localhost:${port}\n`);
  });

  req.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      console.log(`❌ Port ${port} is NOT running: ${appName}\n`);
    } else {
      console.log(`⚠️  Port ${port} check failed: ${err.message}\n`);
    }
  });

  req.setTimeout(2000, () => {
    req.destroy();
    console.log(`⏱️  Port ${port} check timeout (might be running but slow)\n`);
  });
}

// Wait a bit for async checks
setTimeout(() => {
  console.log('='.repeat(50));
  console.log('📝 Instructions:');
  console.log('1. If port 3000 is running → Open http://localhost:3000');
  console.log('2. If port 3001 is running → That is a DIFFERENT application');
  console.log('3. Make sure you are running: npm start (in IoT-QR-Consumer folder)');
  console.log('4. If you see errors about port 3001 → Close that application first');
}, 3000);








