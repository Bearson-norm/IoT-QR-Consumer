const { Pool } = require('pg');
require('dotenv').config();

async function verifyConnection() {
  console.log('==========================================');
  console.log('Verifikasi Koneksi Database PostgreSQL');
  console.log('==========================================');
  console.log('');

  // Get config from environment or defaults
  const config = {
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'iot_qr_consumer',
  };

  console.log('Konfigurasi Database:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  User: ${config.user}`);
  console.log(`  Password: ${'*'.repeat(config.password.length)}`);
  console.log('');

  const pool = new Pool(config);

  try {
    console.log('Mencoba koneksi ke database...');
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    
    console.log('✓ Koneksi berhasil!');
    console.log(`  Waktu server: ${result.rows[0].current_time}`);
    console.log(`  PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    console.log('');

    // Test database exists
    const dbCheck = await pool.query("SELECT datname FROM pg_database WHERE datname = $1", [config.database]);
    if (dbCheck.rows.length > 0) {
      console.log(`✓ Database "${config.database}" ditemukan`);
    } else {
      console.log(`✗ Database "${config.database}" tidak ditemukan`);
      console.log('  Buat database dengan: node scripts/setup-database-vps.js');
    }
    console.log('');

    // Test user exists
    const userCheck = await pool.query("SELECT usename FROM pg_user WHERE usename = $1", [config.user]);
    if (userCheck.rows.length > 0) {
      console.log(`✓ User "${config.user}" ditemukan`);
    } else {
      console.log(`✗ User "${config.user}" tidak ditemukan`);
      console.log('  Buat user dengan: node scripts/setup-database-vps.js');
    }
    console.log('');

    // Test tables
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesCheck.rows.length > 0) {
      console.log(`✓ Tabel ditemukan (${tablesCheck.rows.length}):`);
      tablesCheck.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('⚠️  Belum ada tabel. Aplikasi akan membuat tabel otomatis saat start.');
    }

    await pool.end();
    console.log('');
    console.log('==========================================');
    console.log('✓ Semua verifikasi berhasil!');
    console.log('==========================================');
    process.exit(0);

  } catch (err) {
    await pool.end();
    console.log('✗ Koneksi gagal!');
    console.log('');
    console.log('Error:', err.message);
    console.log('');

    // Provide helpful error messages
    if (err.message.includes('password authentication failed')) {
      console.log('==========================================');
      console.log('Masalah: Password Authentication Failed');
      console.log('==========================================');
      console.log('');
      console.log('Kemungkinan penyebab:');
      console.log('  1. Password di .env file salah');
      console.log('  2. User tidak ada di PostgreSQL');
      console.log('  3. Password user di PostgreSQL berbeda');
      console.log('');
      console.log('Solusi:');
      console.log('  1. Cek file .env:');
      console.log('     cat /var/www/iot-qr-consumer/.env');
      console.log('');
      console.log('  2. Test koneksi manual:');
      console.log(`     psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database}`);
      console.log('');
      console.log('  3. Jika password salah, update di .env atau reset password user:');
      console.log(`     ALTER USER ${config.user} WITH PASSWORD 'new_password';`);
      console.log('');
      console.log('  4. Jika user tidak ada, buat dengan:');
      console.log('     node scripts/setup-database-vps.js');
    } else if (err.message.includes('does not exist')) {
      console.log('==========================================');
      console.log('Masalah: Database atau User Tidak Ada');
      console.log('==========================================');
      console.log('');
      console.log('Solusi:');
      console.log('  node scripts/setup-database-vps.js');
    } else if (err.message.includes('connection refused') || err.message.includes('ECONNREFUSED')) {
      console.log('==========================================');
      console.log('Masalah: PostgreSQL Service Tidak Berjalan');
      console.log('==========================================');
      console.log('');
      console.log('Solusi:');
      console.log('  sudo systemctl start postgresql');
      console.log('  sudo systemctl status postgresql');
    } else if (err.message.includes('timeout')) {
      console.log('==========================================');
      console.log('Masalah: Connection Timeout');
      console.log('==========================================');
      console.log('');
      console.log('Kemungkinan:');
      console.log('  1. PostgreSQL tidak berjalan');
      console.log('  2. Port salah (cek DB_PORT di .env)');
      console.log('  3. Firewall memblokir koneksi');
    }

    console.log('');
    process.exit(1);
  }
}

verifyConnection();
