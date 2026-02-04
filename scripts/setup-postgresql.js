#!/usr/bin/env node

/**
 * Script untuk setup database PostgreSQL
 * Menjalankan script ini akan membuat database dan user jika belum ada
 * 
 * Usage: node scripts/setup-postgresql.js
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

async function setupDatabase() {
  console.log('=== PostgreSQL Database Setup ===\n');
  console.log('NOTE: You need to use a PostgreSQL superuser (usually "postgres")');
  console.log('      to create database and user. The "admin" user will be created\n');
  console.log('      for the application to use.\n');
  
  // Get connection details
  const host = process.env.PG_HOST || await question('PostgreSQL host (default: localhost): ') || 'localhost';
  const port = process.env.PG_PORT || await question('PostgreSQL port (default: 5433): ') || '5433';
  const superuser = process.env.PG_SUPERUSER || await question('PostgreSQL superuser (default: postgres): ') || 'postgres';
  const superuserPassword = process.env.PG_PASSWORD || await question(`Password for ${superuser}: `);
  
  if (!superuserPassword) {
    console.error('\n✗ Error: Password is required');
    rl.close();
    process.exit(1);
  }
  
  const dbName = 'iot_qr_consumer';
  const dbUser = 'admin';
  const dbPassword = 'Admin123';
  
  // Connect as superuser
  const superClient = new Client({
    host,
    port: parseInt(port),
    user: superuser,
    password: superuserPassword,
    database: 'postgres' // Connect to default postgres database
  });
  
  try {
    await superClient.connect();
    console.log('\n✓ Connected to PostgreSQL server\n');
    
    // Check if user has CREATEDB privilege
    const roleCheck = await superClient.query(
      "SELECT rolcreatedb FROM pg_roles WHERE rolname = $1",
      [superuser]
    );
    
    if (roleCheck.rows.length === 0) {
      throw new Error(`User ${superuser} does not exist`);
    }
    
    if (!roleCheck.rows[0].rolcreatedb && superuser !== 'postgres') {
      console.warn(`⚠ Warning: User ${superuser} may not have CREATEDB privilege.`);
      console.warn('  If you encounter permission errors, try using "postgres" as superuser.\n');
    }
    
    // Check if database exists
    const dbCheck = await superClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    
    if (dbCheck.rows.length === 0) {
      console.log(`Creating database: ${dbName}...`);
      await superClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ Database ${dbName} created\n`);
    } else {
      console.log(`✓ Database ${dbName} already exists\n`);
    }
    
    // Check if user exists
    const userCheck = await superClient.query(
      "SELECT 1 FROM pg_user WHERE usename = $1",
      [dbUser]
    );
    
    if (userCheck.rows.length === 0) {
      console.log(`Creating user: ${dbUser}...`);
      // PostgreSQL requires username to be identifier (not parameterized)
      // Since we control the username value, it's safe to use directly
      // We use double quotes to handle case-sensitive identifiers
      await superClient.query(
        `CREATE USER "${dbUser}" WITH PASSWORD $1`,
        [dbPassword]
      );
      console.log(`✓ User ${dbUser} created\n`);
    } else {
      console.log(`✓ User ${dbUser} already exists\n`);
      // Update password
      // PostgreSQL: username must be identifier, password can be parameterized
      // But we need to escape single quotes in password for safety
      console.log(`Updating password for user ${dbUser}...`);
      // Escape single quotes in password by doubling them
      const escapedPassword = dbPassword.replace(/'/g, "''");
      await superClient.query(
        `ALTER USER "${dbUser}" WITH PASSWORD '${escapedPassword}'`
      );
      console.log(`✓ Password updated\n`);
    }
    
    // Grant privileges
    console.log(`Granting privileges to ${dbUser}...`);
    await superClient.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser}`);
    console.log(`✓ Privileges granted\n`);
    
    await superClient.end();
    
    // Connect to the new database to grant schema privileges
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
    await dbClient.query(`GRANT USAGE ON SCHEMA public TO "${dbUser}"`);
    await dbClient.query(`GRANT CREATE ON SCHEMA public TO "${dbUser}"`);
    await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${dbUser}"`);
    await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${dbUser}"`);
    await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "${dbUser}"`);
    
    // Make user owner of schema (most permissive)
    await dbClient.query(`ALTER SCHEMA public OWNER TO "${dbUser}"`);
    
    console.log('✓ Schema privileges granted\n');
    
    await dbClient.end();
    
    console.log('=== Setup Complete ===\n');
    console.log('Database configuration:');
    console.log(`  Host: ${host}`);
    console.log(`  Port: ${port}`);
    console.log(`  Database: ${dbName}`);
    console.log(`  User: ${dbUser}`);
    console.log(`  Password: ${dbPassword}\n`);
    console.log('You can now run: npm start\n');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('password authentication failed')) {
      console.error('\n  Possible solutions:');
      console.error('  1. Check if the password is correct');
      console.error('  2. Verify PostgreSQL is running');
      console.error('  3. Check pg_hba.conf if authentication method allows password');
    } else if (error.message.includes('permission denied')) {
      console.error('\n  Possible solutions:');
      console.error('  1. Use "postgres" as superuser (default PostgreSQL superuser)');
      console.error('  2. Or use a user with CREATEDB privilege');
      console.error('  3. Or manually create database using psql:');
      console.error(`     psql -U postgres -c "CREATE DATABASE ${dbName};"`);
      console.error(`     psql -U postgres -c "CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}';"`);
      console.error(`     psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};"`);
    }
    
    if (superClient && !superClient.ended) {
      await superClient.end();
    }
    rl.close();
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
setupDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
