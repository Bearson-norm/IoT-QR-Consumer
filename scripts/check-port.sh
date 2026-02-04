#!/bin/bash

# Script untuk cek port yang digunakan aplikasi

APP_NAME="iot-qr-consumer"
PORT=${1:-5567}

echo "=========================================="
echo "Cek Port untuk $APP_NAME"
echo "=========================================="
echo ""

# Cek apakah PM2 running
if ! command -v pm2 &> /dev/null; then
    echo "✗ PM2 tidak terinstall"
    exit 1
fi

# Cek apakah aplikasi running
if ! pm2 list | grep -q "$APP_NAME"; then
    echo "✗ Aplikasi tidak running"
    echo "  Start dengan: pm2 start ecosystem.config.js --env production"
    exit 1
fi

echo "✓ Aplikasi running"
echo ""

# Cek port dari PM2 info
PM2_PORT=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.env.PORT" 2>/dev/null || echo "")

if [ -n "$PM2_PORT" ] && [ "$PM2_PORT" != "null" ]; then
    echo "Port dari PM2 env: $PM2_PORT"
else
    echo "Port dari PM2 env: (tidak ditemukan, menggunakan default)"
fi

# Cek port yang listening
echo ""
echo "Port yang sedang listening:"
if command -v ss &> /dev/null; then
    ss -tlnp | grep ":$PORT " || echo "  Port $PORT tidak listening"
elif command -v netstat &> /dev/null; then
    netstat -tlnp | grep ":$PORT " || echo "  Port $PORT tidak listening"
else
    echo "  Install ss atau netstat untuk cek port"
fi

# Cek dari .env file
if [ -f .env ]; then
    echo ""
    echo "Port dari .env file:"
    grep "^PORT=" .env || echo "  PORT tidak ditemukan di .env"
fi

echo ""
echo "=========================================="
echo "Instruksi:"
echo "=========================================="
echo ""
echo "1. Pastikan .env file memiliki PORT=5567:"
echo "   nano .env"
echo ""
echo "2. Restart aplikasi dengan update env:"
echo "   pm2 restart $APP_NAME --update-env"
echo ""
echo "3. Verifikasi:"
echo "   pm2 logs $APP_NAME --lines 10"
echo "   curl http://localhost:$PORT"
echo ""
