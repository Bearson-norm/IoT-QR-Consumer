const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to database\n');
});

// Count total employees
db.get('SELECT COUNT(*) as count FROM employee_data', (err, row) => {
  if (err) {
    console.error('Error:', err.message);
    db.close();
    return;
  }
  console.log(`Total employees in database: ${row.count}\n`);
});

// Show first 10 employees
db.all('SELECT employee_id, name FROM employee_data ORDER BY employee_id LIMIT 10', (err, rows) => {
  if (err) {
    console.error('Error:', err.message);
    db.close();
    return;
  }
  console.log('Sample employees (first 10):');
  rows.forEach(row => {
    console.log(`  ${row.employee_id} - ${row.name}`);
  });
  console.log('\n...\n');
  
  // Show last 10 employees
  db.all('SELECT employee_id, name FROM employee_data ORDER BY employee_id DESC LIMIT 10', (err, rows) => {
    if (err) {
      console.error('Error:', err.message);
      db.close();
      return;
    }
    console.log('Sample employees (last 10):');
    rows.forEach(row => {
      console.log(`  ${row.employee_id} - ${row.name}`);
    });
    db.close();
  });
});







