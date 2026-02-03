const { Client } = require('pg');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupDatabase() {
  console.log('=== PostgreSQL Database Setup untuk VPS ===\n');
  console.log('NOTE: Anda perlu menggunakan PostgreSQL superuser (biasanya "postgres")');
  console.log('      untuk membuat database dan user. User "admin" akan dibuat');
  console.log('      untuk digunakan aplikasi.\n');
  
  // Get connection details dengan default dari environment variables
  const defaultHost = process.env.DB_HOST || 'localhost';
  const defaultPort = process.env.DB_PORT || '5433';
  const defaultSuperuser = process.env.PG_SUPERUSER || 'postgres';
  
  const host = await question(`PostgreSQL host (default: ${defaultHost}): `) || defaultHost;
  const port = await question(`PostgreSQL port (default: ${defaultPort}): `) || defaultPort;
  const superuser = await question(`PostgreSQL superuser (default: ${defaultSuperuser}): `) || defaultSuperuser;
  const superuserPassword = process.env.PG_PASSWORD || await question(`Password untuk ${superuser}: `);
  
  if (!superuserPassword) {
    console.error('\n✗ Error: Password diperlukan');
    rl.close();
    process.exit(1);
  }
  
  const dbName = process.env.DB_NAME || 'iot_qr_consumer';
  const dbUser = process.env.DB_USER || 'admin';
  const dbPassword = process.env.DB_PASSWORD || await question(`Password untuk user ${dbUser} (default: admin123): `) || 'admin123';
  
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
    console.log('\n✓ Connected to PostgreSQL as superuser');
    
    // Check if database exists
    const dbCheckResult = await superClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (dbCheckResult.rows.length === 0) {
      // Create database
      await superClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ Database "${dbName}" created`);
    } else {
      console.log(`✓ Database "${dbName}" already exists`);
    }
    
    // Check if user exists
    const userCheckResult = await superClient.query(
      `SELECT 1 FROM pg_user WHERE usename = $1`,
      [dbUser]
    );
    
    if (userCheckResult.rows.length === 0) {
      // Create user
      await superClient.query(
        `CREATE USER ${dbUser} WITH PASSWORD $1`,
        [dbPassword]
      );
      console.log(`✓ User "${dbUser}" created`);
    } else {
      // Update password if user exists
      await superClient.query(
        `ALTER USER ${dbUser} WITH PASSWORD $1`,
        [dbPassword]
      );
      console.log(`✓ User "${dbUser}" password updated`);
    }
    
    // Grant privileges on database
    await superClient.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser}`
    );
    console.log(`✓ Privileges granted to "${dbUser}" on database "${dbName}"`);
    
    // Connect to the new database to grant schema privileges
    await superClient.end();
    const dbClient = new Client({
      host,
      port: parseInt(port),
      user: superuser,
      password: superuserPassword,
      database: dbName
    });
    
    await dbClient.connect();
    
    // Grant schema privileges
    await dbClient.query(`GRANT ALL ON SCHEMA public TO ${dbUser}`);
    await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${dbUser}`);
    await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${dbUser}`);
    console.log(`✓ Schema privileges granted to "${dbUser}"`);
    
    await dbClient.end();
    
    console.log('\n==========================================');
    console.log('✓ Database setup completed successfully!');
    console.log('==========================================\n');
    console.log('Database Configuration:');
    console.log(`  Host: ${host}`);
    console.log(`  Port: ${port}`);
    console.log(`  Database: ${dbName}`);
    console.log(`  User: ${dbUser}`);
    console.log(`  Password: ${'*'.repeat(dbPassword.length)}`);
    console.log('\nPastikan konfigurasi ini sesuai dengan file .env Anda!\n');
    
  } catch (err) {
    console.error('\n✗ Error setting up database:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
setupDatabase();
