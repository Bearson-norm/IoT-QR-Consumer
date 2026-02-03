const { pool } = require('../database');
const bcrypt = require('bcryptjs');

// List of users to create for OVT approval
const ovtUsers = [
  'production',
  'warehouse',
  'logistic',
  'maintenance',
  'rnd',
  'finance',
  'qc'
];

async function createOvtUsers() {
  console.log('=== Creating OVT Approval Users ===\n');

  try {
    for (const username of ovtUsers) {
      const password = `${username}123`;
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Check if user already exists
      const checkResult = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (checkResult.rows.length > 0) {
        // Update password if user exists
        await pool.query(
          'UPDATE users SET password = $1 WHERE username = $2',
          [hashedPassword, username]
        );
        console.log(`✓ User ${username} updated (password: ${password})`);
      } else {
        // Insert new user
        await pool.query(
          'INSERT INTO users (username, password) VALUES ($1, $2)',
          [username, hashedPassword]
        );
        console.log(`✓ User ${username} created (password: ${password})`);
      }
    }

    console.log('\n=== All OVT users created successfully ===');
  } catch (error) {
    console.error('Error creating users:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
createOvtUsers();
