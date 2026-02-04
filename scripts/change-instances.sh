#!/bin/bash

# Script untuk mengubah jumlah PM2 cluster instances

APP_NAME="iot-qr-consumer"
DEPLOY_PATH="${1:-/var/www/iot-qr-consumer}"

echo "=========================================="
echo "Ubah Jumlah Cluster Instances untuk $APP_NAME"
echo "=========================================="
echo ""

cd "$DEPLOY_PATH" || exit 1

# Check current instances
CURRENT_INSTANCES=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.instances" 2>/dev/null || echo "unknown")
CURRENT_MODE=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.exec_mode" 2>/dev/null || echo "unknown")

if [ "$CURRENT_MODE" != "cluster_mode" ]; then
    echo "✗ Aplikasi tidak dalam cluster mode"
    echo "  Current mode: $CURRENT_MODE"
    echo "  Jalankan: ./scripts/switch-to-cluster.sh"
    exit 1
fi

echo "Current configuration:"
echo "  Mode: $CURRENT_MODE"
echo "  Instances: $CURRENT_INSTANCES"
echo ""

# Get CPU cores
CPU_CORES=$(nproc)
echo "Available CPU cores: $CPU_CORES"
echo ""

# Get current PM2_INSTANCES from .env
if [ -f .env ]; then
    CURRENT_ENV_INSTANCES=$(grep "^PM2_INSTANCES=" .env | cut -d'=' -f2 || echo "")
    if [ -n "$CURRENT_ENV_INSTANCES" ]; then
        echo "PM2_INSTANCES di .env: $CURRENT_ENV_INSTANCES"
    else
        echo "PM2_INSTANCES tidak ada di .env (menggunakan default: max)"
    fi
else
    echo ".env file tidak ditemukan"
fi

echo ""
echo "Masukkan jumlah instances yang diinginkan:"
echo "  - Angka (contoh: 2, 4, 8)"
echo "  - 'max' untuk semua CPU cores"
echo "  - Tekan Enter untuk cancel"
echo ""
read -p "Jumlah instances: " NEW_INSTANCES

if [ -z "$NEW_INSTANCES" ]; then
    echo "Canceled."
    exit 0
fi

# Validate input
if [ "$NEW_INSTANCES" != "max" ] && ! [[ "$NEW_INSTANCES" =~ ^[0-9]+$ ]]; then
    echo "✗ Input tidak valid. Harus angka atau 'max'"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "Membuat file .env..."
    touch .env
fi

# Update .env
if grep -q "^PM2_INSTANCES=" .env; then
    # Update existing
    sed -i "s/^PM2_INSTANCES=.*/PM2_INSTANCES=$NEW_INSTANCES/" .env
    echo "✓ Updated PM2_INSTANCES di .env"
else
    # Add new
    echo "" >> .env
    echo "# PM2 Cluster Configuration" >> .env
    echo "PM2_INSTANCES=$NEW_INSTANCES" >> .env
    echo "✓ Added PM2_INSTANCES ke .env"
fi

echo ""
echo "Reloading aplikasi dengan instances baru..."
pm2 reload "$APP_NAME" --update-env

# Wait a moment
sleep 2

# Check result
NEW_INSTANCES_COUNT=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.instances" 2>/dev/null || echo "unknown")
INSTANCE_COUNT=$(pm2 list | grep "$APP_NAME" | wc -l)

echo ""
echo "=========================================="
echo "✓ Instances berhasil diubah!"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  PM2_INSTANCES: $NEW_INSTANCES"
echo "  Actual instances: $NEW_INSTANCES_COUNT"
echo "  Running processes: $INSTANCE_COUNT"
echo ""
echo "Status:"
pm2 status "$APP_NAME"
echo ""
