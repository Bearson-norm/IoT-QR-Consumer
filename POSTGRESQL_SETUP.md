# Setup PostgreSQL untuk IoT-QR-Consumer

## Prerequisites

1. Install PostgreSQL di sistem Anda
   - Windows: Download dari https://www.postgresql.org/download/windows/
   - Linux: `sudo apt-get install postgresql` (Ubuntu/Debian) atau `sudo yum install postgresql` (CentOS/RHEL)
   - macOS: `brew install postgresql`

2. Pastikan PostgreSQL service berjalan
   - Windows: Service biasanya berjalan otomatis setelah instalasi
   - Linux: `sudo systemctl start postgresql`
   - macOS: `brew services start postgresql`

## Setup Database

Ada 3 cara untuk setup database:

### Cara 1: Menggunakan Script Node.js (Recommended)

```bash
node scripts/setup-postgresql.js
```

Script akan meminta:
- PostgreSQL host (default: localhost)
- PostgreSQL port (default: 5432)
- PostgreSQL superuser (default: postgres) - **PENTING: Gunakan superuser, bukan user biasa**
- Password untuk superuser

**Catatan:** Pastikan menggunakan superuser (biasanya `postgres`) bukan user biasa seperti `admin`.

### Cara 2: Menggunakan SQL Script

```bash
# Windows
psql -U postgres -f scripts\setup-postgresql.sql

# Linux/macOS
psql -U postgres -f scripts/setup-postgresql.sql
```

Atau login ke psql terlebih dahulu:
```bash
psql -U postgres
```
Lalu copy-paste isi file `scripts/setup-postgresql.sql`

### Cara 3: Manual Setup

#### 1. Login ke PostgreSQL sebagai superuser

```bash
# Windows (gunakan psql dari bin folder PostgreSQL)
psql -U postgres

# Linux/macOS
sudo -u postgres psql
```

#### 2. Buat database dan user

```sql
-- Buat database
CREATE DATABASE iot_qr_consumer;

-- Buat user admin (jika belum ada)
CREATE USER admin WITH PASSWORD 'admin123';

-- Berikan semua privileges ke user admin untuk database iot_qr_consumer
GRANT ALL PRIVILEGES ON DATABASE iot_qr_consumer TO admin;

-- Connect ke database
\c iot_qr_consumer

-- Berikan privileges untuk membuat schema dan tables
GRANT ALL ON SCHEMA public TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;

-- Exit
\q
```

### 3. Install Dependencies Node.js

```bash
npm install
```

Ini akan menginstall `pg` (PostgreSQL client) dan menghapus `sqlite3` dari dependencies.

### 4. Jalankan Aplikasi

```bash
npm start
```

Aplikasi akan otomatis:
- Connect ke PostgreSQL database
- Membuat semua tabel yang diperlukan (employee_data, scan_records, users, ovt_permissions)
- Insert default admin user (username: admin, password: admin123)
- Insert sample employees (jika tabel kosong)

## Konfigurasi Koneksi

Jika Anda perlu mengubah konfigurasi koneksi (host, port, database name, dll), edit file `database.js`:

```javascript
const pool = new Pool({
  user: 'admin',           // Username
  password: 'admin123',     // Password
  host: 'localhost',       // Host (default: localhost)
  port: 5432,              // Port (default: 5432)
  database: 'iot_qr_consumer', // Database name
  // ...
});
```

## Troubleshooting

### Error: "password authentication failed"
- Pastikan password yang digunakan sesuai dengan yang di-set di PostgreSQL
- Cek file `database.js` untuk konfirmasi username dan password

### Error: "database does not exist"
- Pastikan database `iot_qr_consumer` sudah dibuat
- Ikuti langkah 2 di atas untuk membuat database

### Error: "permission denied"
- Pastikan user `admin` memiliki privileges yang cukup
- Jalankan perintah GRANT seperti yang ditunjukkan di langkah 2

### Error: "connection refused"
- Pastikan PostgreSQL service berjalan
- Cek apakah port 5432 terbuka dan tidak diblokir firewall
- Pastikan host dan port di konfigurasi sesuai dengan setup PostgreSQL Anda

## Migrasi Data dari SQLite (Opsional)

Jika Anda memiliki data di SQLite yang ingin dimigrasikan:

1. Export data dari SQLite ke CSV atau SQL
2. Import ke PostgreSQL menggunakan `psql` atau tools migrasi lainnya

Contoh menggunakan psql:
```bash
psql -U admin -d iot_qr_consumer -f data_export.sql
```

## Catatan

- File `database.sqlite` tidak akan digunakan lagi setelah migrasi ke PostgreSQL
- Semua data akan disimpan di PostgreSQL database `iot_qr_consumer`
- Backup database secara berkala menggunakan `pg_dump`:
  ```bash
  pg_dump -U admin -d iot_qr_consumer > backup.sql
  ```
