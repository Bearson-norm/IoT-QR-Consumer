const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying IoT-QR-Consumer Setup...\n');

let hasErrors = false;

// Check required files
const requiredFiles = [
  'server.js',
  'package.json',
  'database.js',
  'public/index.html',
  'public/script.js',
  'public/styles.css',
  'routes/scan.js',
  'routes/report.js',
  'routes/employee.js',
  'routes/auth.js',
  'routes/ovt.js'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
    hasErrors = true;
  }
});

// Check node_modules
console.log('\n📦 Checking dependencies...');
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('  ✅ node_modules exists');
  
  // Check key dependencies
  const keyDeps = ['express', 'sqlite3', 'xlsx', 'bcryptjs'];
  keyDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      console.log(`  ✅ ${dep} installed`);
    } else {
      console.log(`  ❌ ${dep} - NOT INSTALLED!`);
      hasErrors = true;
    }
  });
} else {
  console.log('  ❌ node_modules not found - Run: npm install');
  hasErrors = true;
}

// Check database
console.log('\n💾 Checking database...');
const dbPath = path.join(__dirname, '..', 'database.sqlite');
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log(`  ✅ database.sqlite exists (${(stats.size / 1024).toFixed(2)} KB)`);
} else {
  console.log('  ⚠️  database.sqlite not found (will be created on first run)');
}

// Check port availability (basic check)
console.log('\n🌐 Checking configuration...');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')));
console.log(`  ✅ Package name: ${packageJson.name}`);
console.log(`  ✅ Version: ${packageJson.version}`);

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Setup verification FAILED!');
  console.log('\nPlease fix the errors above and run: npm install');
  process.exit(1);
} else {
  console.log('✅ Setup verification PASSED!');
  console.log('\nYou can now run: npm start');
  console.log('Then open: http://localhost:3000');
  process.exit(0);
}








