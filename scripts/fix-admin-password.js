#!/usr/bin/env node

/**
 * Script untuk memperbaiki password user admin di PostgreSQL
 * Gunakan script ini jika password admin tidak sesuai
 * 
 * Usage: node scripts/fix-admin-password.js
 */

const { Client } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function fixPassword() {
  console.log('=== Fix Admin Password ===\n');
  
  const host = process.env.PG_HOST || await question('PostgreSQL host (default: localhost): ') || 'localhost';
  const port = process.env.PG_PORT || await question('PostgreSQL port (default: 5432): ') || '5432';
  const superuser = process.env.PG_SUPERUSER || await question('PostgreSQL superuser (default: postgres): ') || 'postgres';
  const superuserPassword = process.env.PG_PASSWORD || await question(`Password for ${superuser}: `);
  
  if (!superuserPassword) {
    console.error('\n✗ Error: Password is required');
    rl.close();
    process.exit(1);
  }
  
  const dbUser = 'admin';
  const dbPassword = 'admin123';
  
  const client = new Client({
    host,
    port: parseInt(port),
    user: superuser,
    password: superuserPassword,
    database: 'postgres'
  });
  
  try {
    await client.connect();
    console.log('\n✓ Connected to PostgreSQL server\n');
    
    // Update password
    console.log(`Updating password for user ${dbUser}...`);
    const escapedPassword = dbPassword.replace(/'/g, "''");
    await client.query(
      `ALTER USER "${dbUser}" WITH PASSWORD '${escapedPassword}'`
    );
    console.log(`✓ Password updated to: ${dbPassword}\n`);
    
    console.log('=== Done ===\n');
    console.log('You can now run: npm start\n');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.message.includes('password authentication failed')) {
      console.error('\n  Check if the superuser password is correct');
    } else if (error.message.includes('does not exist')) {
      console.error(`\n  User ${dbUser} does not exist. Run setup-postgresql.js first.`);
    }
    process.exit(1);
  } finally {
    await client.end();
    rl.close();
  }
}

fixPassword().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
