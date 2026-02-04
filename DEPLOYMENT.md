# Panduan Deployment VPS dengan CI/CD GitHub Actions

Panduan lengkap untuk mendeploy aplikasi IoT-QR-Consumer ke VPS menggunakan GitHub Actions dengan PM2 fork mode.

## Daftar Isi

1. [Prerequisites](#prerequisites)
2. [Setup VPS](#setup-vps)
3. [Setup Database PostgreSQL](#setup-database-postgresql)
4. [Setup GitHub Actions](#setup-github-actions)
5. [Setup Nginx (Reverse Proxy)](#setup-nginx-reverse-proxy)
6. [Deployment Manual (Opsional)](#deployment-manual-opsional)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Di VPS:
- Ubuntu/Debian Linux (atau distribusi Linux lainnya)
- Node.js 18+ dan npm
- PostgreSQL (dengan port 5433)
- Nginx (opsional, untuk reverse proxy)
- SSH access dengan key authentication

### Di GitHub:
- Repository dengan akses write
- GitHub Actions enabled

---

## Setup VPS

### 1. Install Node.js dan npm

```bash
# Update package list
sudo apt update

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 startup script
pm2 startup
# Ikuti instruksi yang muncul untuk menjalankan command sebagai root

# Verify PM2 installation
pm2 --version
```

### 3. Install PostgreSQL (jika belum)

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify PostgreSQL is running
sudo systemctl status postgresql
```

### 4. Setup SSH Key untuk GitHub Actions

#### Opsi A: Cari SSH Key yang Sudah Ada

```bash
# Jalankan script untuk mencari SSH key yang sudah ada
cd /var/www/iot-qr-consumer
chmod +x scripts/find-ssh-key.sh
./scripts/find-ssh-key.sh
```

Script akan mencari SSH key di berbagai lokasi umum. Jika ditemukan, tampilkan private key:

```bash
# Tampilkan private key (copy untuk GitHub Secrets)
cat ~/.ssh/github_actions_deploy
# atau lokasi lain yang ditemukan script
```

#### Opsi B: Buat SSH Key Baru

Jika tidak ada SSH key yang ditemukan:

```bash
# Generate SSH key pair baru
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Jangan set passphrase (tekan Enter saja) untuk automated deployment
# Atau set passphrase jika ingin lebih aman (tapi perlu setup ssh-agent)

# Copy public key ke authorized_keys
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys

# Set proper permissions
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/github_actions_deploy
chmod 644 ~/.ssh/github_actions_deploy.pub
chmod 700 ~/.ssh

# Display private key (copy ini untuk GitHub Secrets)
cat ~/.ssh/github_actions_deploy
```

#### Opsi C: Gunakan SSH Key yang Sudah Ada (Lokasi Lain)

Jika Anda sudah punya SSH key di lokasi lain:

```bash
# Cari semua file key
find ~ -name "*github*" -o -name "*deploy*" 2>/dev/null | grep -i key
find ~/.ssh -type f -name "*" ! -name "*.pub" 2>/dev/null

# Setelah ditemukan, tampilkan private key
cat /path/to/your/existing/key

# Pastikan public key sudah di authorized_keys
cat /path/to/your/existing/key.pub >> ~/.ssh/authorized_keys
```

**PENTING:** 
- Copy **private key** (bukan public key) untuk digunakan di GitHub Secrets
- Private key biasanya dimulai dengan `-----BEGIN OPENSSH PRIVATE KEY-----` atau `-----BEGIN RSA PRIVATE KEY-----`
- Jangan share private key ke publik!

### 5. Buat Direktori Deployment

```bash
# Buat direktori deployment
sudo mkdir -p /var/www/iot-qr-consumer
sudo chown $USER:$USER /var/www/iot-qr-consumer

# Buat direktori logs
mkdir -p /var/www/iot-qr-consumer/logs
```

---

## Setup Database PostgreSQL

### 1. Setup Database dengan Script

```bash
# Clone atau copy file aplikasi ke VPS
cd /var/www/iot-qr-consumer

# Jalankan script setup database
node scripts/setup-database-vps.js
```

Script akan meminta:
- PostgreSQL host (default: localhost)
- PostgreSQL port (default: 5433)
- PostgreSQL superuser (default: postgres)
- Password superuser
- Password untuk user admin

### 2. Setup Database Manual (Alternatif)

```bash
# Login sebagai postgres user
sudo -u postgres psql

# Di dalam psql, jalankan:
CREATE DATABASE iot_qr_consumer;
CREATE USER admin WITH PASSWORD 'admin123';
GRANT ALL PRIVILEGES ON DATABASE iot_qr_consumer TO admin;

# Connect ke database
\c iot_qr_consumer

# Grant schema privileges
GRANT ALL ON SCHEMA public TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;

# Exit
\q
```

### 3. Konfigurasi PostgreSQL untuk Port 5433

Jika PostgreSQL menggunakan port 5433 (bukan default 5432):

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/*/main/postgresql.conf

# Cari dan ubah:
port = 5433

# Edit pg_hba.conf untuk authentication
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Setup GitHub Actions

### 1. Tambahkan GitHub Secrets

Buka repository GitHub → Settings → Secrets and variables → Actions → New repository secret

Tambahkan secrets berikut:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `VPS_HOST` | IP atau domain VPS | `192.168.1.100` atau `vps.example.com` |
| `VPS_USER` | SSH username | `ubuntu` atau `root` |
| `VPS_SSH_KEY` | Private SSH key | Isi dari `~/.ssh/github_actions_deploy` |
| `VPS_PORT` | SSH port (opsional) | `22` (default) |
| `VPS_DEPLOY_PATH` | Path deployment (opsional) | `/var/www/iot-qr-consumer` (default) |

### 2. Verifikasi Workflow

Setelah push ke branch `main` atau `master`, workflow akan otomatis berjalan.

Cek status di: GitHub Repository → Actions tab

### 3. Buat File .env di VPS

**PENTING:** File `.env` tidak di-sync oleh GitHub Actions. Buat manual di VPS:

```bash
cd /var/www/iot-qr-consumer
nano .env
```

Isi dengan:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5433
DB_USER=admin
DB_PASSWORD=admin123
DB_NAME=iot_qr_consumer

# Database Connection Pool Settings
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

**PENTING:** Ganti password dengan password yang aman!

---

## Setup Nginx (Reverse Proxy)

### 1. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Konfigurasi Nginx

```bash
# Copy contoh konfigurasi
sudo cp /var/www/iot-qr-consumer/nginx.conf.example /etc/nginx/sites-available/iot-qr-consumer

# Edit konfigurasi
sudo nano /etc/nginx/sites-available/iot-qr-consumer
```

Ubah `your-subdomain.example.com` dengan subdomain Anda.

### 3. Aktifkan Konfigurasi

```bash
# Buat symlink
sudo ln -s /etc/nginx/sites-available/iot-qr-consumer /etc/nginx/sites-enabled/

# Test konfigurasi
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 4. Setup DNS

Tambahkan A record di DNS provider Anda:
```
Type: A
Name: your-subdomain
Value: IP_VPS_ANDA
TTL: 3600
```

---

## Deployment Manual (Opsional)

Jika ingin deploy manual tanpa GitHub Actions:

```bash
# Clone repository
cd /var/www
git clone https://github.com/your-username/iot-qr-consumer.git
cd iot-qr-consumer

# Install dependencies
npm ci --production

# Buat .env file
cp .env.example .env
nano .env  # Edit sesuai kebutuhan

# Setup database (jika belum)
node scripts/setup-database-vps.js

# Start dengan PM2
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## Cara Kerja Deployment

### Alur Otomatis (GitHub Actions)

1. **Push ke main branch** → GitHub Actions triggered
2. **Checkout & Setup** → Install dependencies untuk validasi
3. **rsync ke VPS** → Transfer file (exclude node_modules, .env, dll)
4. **SSH ke VPS** → Jalankan deployment script
5. **Detect Changes** → Cek apakah restart diperlukan
6. **PM2 Restart/Reload** → Restart jika ada perubahan kode penting, reload jika hanya file statis

### Smart Restart Detection

Script `check-changes.sh` akan mendeteksi perubahan file yang memerlukan restart:

**Restart Required:**
- `server.js`
- `database.js`
- `scheduler.js`
- `package.json` (jika dependencies berubah)
- `routes/*.js`
- `utils/*.js`
- `ecosystem.config.js`

**Reload Only:**
- File statis (HTML, CSS, JS frontend)
- File konfigurasi minor

**Catatan:** Script akan menggunakan git diff jika tersedia, atau fallback ke file modification time. Jika tidak ada perubahan terdeteksi, akan default ke restart (safe option) untuk memastikan aplikasi selalu up-to-date setelah deployment.

---

## PM2 Management

### Perintah PM2 yang Berguna

```bash
# Status aplikasi
pm2 status

# Logs
pm2 logs iot-qr-consumer

# Restart
pm2 restart iot-qr-consumer

# Stop
pm2 stop iot-qr-consumer

# Delete
pm2 delete iot-qr-consumer

# Monitor
pm2 monit

# Save current process list
pm2 save
```

### Auto-restart

PM2 akan otomatis restart aplikasi jika:
- Aplikasi crash
- Server reboot (jika sudah setup startup script)
- Manual restart via GitHub Actions

---

## Troubleshooting

### 1. Deployment Gagal: SSH Connection Refused

```bash
# Cek SSH service
sudo systemctl status ssh

# Cek firewall
sudo ufw status
sudo ufw allow 22/tcp
```

### 2. Deployment Gagal: Permission Denied

```bash
# Cek ownership direktori
ls -la /var/www/iot-qr-consumer

# Fix ownership
sudo chown -R $USER:$USER /var/www/iot-qr-consumer
```

### 3. Aplikasi Tidak Start: Database Error

```bash
# Cek PostgreSQL running
sudo systemctl status postgresql

# Test connection
psql -h localhost -p 5433 -U admin -d iot_qr_consumer

# Cek .env file
cat /var/www/iot-qr-consumer/.env
```

### 4. PM2 Tidak Restart Setelah Deployment

```bash
# Cek PM2 logs
pm2 logs iot-qr-consumer --lines 50

# Manual restart
pm2 restart iot-qr-consumer

# Cek apakah script deploy.sh executable
ls -la /var/www/iot-qr-consumer/scripts/deploy.sh
chmod +x /var/www/iot-qr-consumer/scripts/deploy.sh
```

### 5. Nginx 502 Bad Gateway

```bash
# Cek aplikasi running
pm2 status

# Cek port 3000
netstat -tlnp | grep 3000

# Test aplikasi langsung
curl http://localhost:3000

# Cek nginx error log
sudo tail -f /var/log/nginx/iot-qr-consumer-error.log
```

### 6. GitHub Actions: rsync Failed

```bash
# Cek SSH key di GitHub Secrets
# Pastikan private key lengkap (termasuk header/footer)

# Test SSH connection manual
ssh -p 22 -i ~/.ssh/github_actions_deploy user@vps-host
```

---

## Keamanan

### Best Practices

1. **Jangan commit .env file** - Sudah di-exclude di .gitignore
2. **Gunakan password kuat** - Untuk database dan user
3. **Limit SSH access** - Gunakan key authentication, disable password
4. **Firewall** - Hanya buka port yang diperlukan (22, 80, 443)
5. **Update regularly** - Update sistem dan dependencies

### Firewall Setup (UFW)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (hanya dari localhost)
sudo ufw allow from 127.0.0.1 to any port 5433

# Check status
sudo ufw status
```

---

## Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process info
pm2 show iot-qr-consumer

# Logs dengan filter
pm2 logs iot-qr-consumer --err --lines 100
```

### System Monitoring

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory
free -h

# Check PostgreSQL connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Backup

### Database Backup

```bash
# Backup database
pg_dump -h localhost -p 5433 -U admin -d iot_qr_consumer > backup_$(date +%Y%m%d).sql

# Restore database
psql -h localhost -p 5433 -U admin -d iot_qr_consumer < backup_20240101.sql
```

### Application Backup

```bash
# Backup aplikasi (exclude node_modules dan logs)
tar -czf app_backup_$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='logs' \
  --exclude='.git' \
  /var/www/iot-qr-consumer
```

---

## Support

Jika mengalami masalah:
1. Cek logs: `pm2 logs iot-qr-consumer`
2. Cek GitHub Actions logs di tab Actions
3. Cek nginx logs: `/var/log/nginx/iot-qr-consumer-error.log`
4. Cek PostgreSQL logs: `/var/log/postgresql/postgresql-*.log`

---

**Selamat! Aplikasi Anda sekarang siap untuk production deployment dengan CI/CD!** 🚀
