#!/usr/bin/env node

/**
 * Script untuk memperbaiki permissions user admin di PostgreSQL
 * Gunakan script ini jika user admin tidak memiliki permission untuk membuat tabel
 * 
 * Usage: node scripts/fix-admin-permissions.js
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

async function fixPermissions() {
  console.log('=== Fix Admin Permissions ===\n');
  
  const host = process.env.PG_HOST || await question('PostgreSQL host (default: localhost): ') || 'localhost';
  const port = process.env.PG_PORT || await question('PostgreSQL port (default: 5432): ') || '5432';
  const superuser = process.env.PG_SUPERUSER || await question('PostgreSQL superuser (default: postgres): ') || 'postgres';
  const superuserPassword = process.env.PG_PASSWORD || await question(`Password for ${superuser}: `);
  
  if (!superuserPassword) {
    console.error('\n✗ Error: Password is required');
    rl.close();
    process.exit(1);
  }
  
  const dbName = 'iot_qr_consumer';
  const dbUser = 'admin';
  
  // Connect as superuser to postgres database
  const superClient = new Client({
    host,
    port: parseInt(port),
    user: superuser,
    password: superuserPassword,
    database: 'postgres'
  });
  
  try {
    await superClient.connect();
    console.log('\n✓ Connected to PostgreSQL server\n');
    
    // Grant database privileges
    console.log(`Granting database privileges to ${dbUser}...`);
    await superClient.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO "${dbUser}"`);
    console.log('✓ Database privileges granted\n');
    
    await superClient.end();
    
    // Connect to the target database to grant schema privileges
    const dbClient = new Client({
      host,
      port: parseInt(port),
      user: superuser,
      password: superuserPassword,
      database: dbName
    });
    
    await dbClient.connect();
    console.log(`✓ Connected to database ${dbName}\n`);
    
    // Grant schema privileges
    console.log('Granting schema privileges...');
    await dbClient.query(`GRANT ALL ON SCHEMA public TO "${dbUser}"`);
    await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${dbUser}"`);
    await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${dbUser}"`);
    await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "${dbUser}"`);
    
    // Grant usage and create on schema
    await dbClient.query(`GRANT USAGE ON SCHEMA public TO "${dbUser}"`);
    await dbClient.query(`GRANT CREATE ON SCHEMA public TO "${dbUser}"`);
    
    // Make user owner of schema (most permissive)
    await dbClient.query(`ALTER SCHEMA public OWNER TO "${dbUser}"`);
    
    console.log('✓ Schema privileges granted\n');
    
    await dbClient.end();
    
    console.log('=== Done ===\n');
    console.log('You can now run: npm start\n');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.message.includes('password authentication failed')) {
      console.error('\n  Check if the superuser password is correct');
    } else if (error.message.includes('does not exist')) {
      console.error(`\n  Database or user does not exist. Run setup-postgresql.js first.`);
    }
    if (superClient && !superClient.ended) await superClient.end();
    process.exit(1);
  } finally {
    rl.close();
  }
}

fixPermissions().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
