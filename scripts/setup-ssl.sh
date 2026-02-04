#!/bin/bash

# Script untuk setup SSL dengan Let's Encrypt untuk crs.moof-set.web.id

DOMAIN="crs.moof-set.web.id"
EMAIL="your-email@example.com"  # Ganti dengan email Anda
NGINX_SITE="iot-qr-consumer"

echo "=========================================="
echo "Setup SSL untuk $DOMAIN"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "✗ Script harus dijalankan dengan sudo"
    echo "  Jalankan: sudo bash scripts/setup-ssl.sh"
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
    echo "✓ Certbot installed"
else
    echo "✓ Certbot already installed"
fi

echo ""
echo "PENTING: Pastikan DNS sudah resolve ke IP VPS ini!"
echo "  Test dengan: nslookup $DOMAIN"
echo ""
read -p "Apakah DNS sudah resolve? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "✗ Setup dibatalkan. Setup DNS terlebih dahulu."
    exit 1
fi

# Get email
read -p "Masukkan email untuk Let's Encrypt (untuk notifikasi): " EMAIL
if [ -z "$EMAIL" ]; then
    echo "✗ Email diperlukan"
    exit 1
fi

echo ""
echo "Mendapatkan SSL certificate..."
echo ""

# Obtain certificate
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ SSL certificate berhasil diinstall!"
    echo "=========================================="
    echo ""
    echo "Certificate location:"
    echo "  /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    echo "  /etc/letsencrypt/live/$DOMAIN/privkey.pem"
    echo ""
    echo "Test SSL:"
    echo "  curl https://$DOMAIN"
    echo "  atau buka di browser: https://$DOMAIN"
    echo ""
    echo "Auto-renewal sudah di-setup otomatis."
    echo "Test renewal: sudo certbot renew --dry-run"
else
    echo ""
    echo "✗ Gagal mendapatkan certificate"
    echo "  Pastikan:"
    echo "  1. DNS sudah resolve ke IP VPS"
    echo "  2. Port 80 dan 443 terbuka di firewall"
    echo "  3. Nginx sudah terkonfigurasi dengan benar"
    exit 1
fi
