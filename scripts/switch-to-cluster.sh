#!/bin/bash

# Script untuk switch aplikasi dari fork mode ke cluster mode

APP_NAME="iot-qr-consumer"
DEPLOY_PATH="${1:-/var/www/iot-qr-consumer}"

echo "=========================================="
echo "Switch ke Cluster Mode untuk $APP_NAME"
echo "=========================================="
echo ""

cd "$DEPLOY_PATH" || exit 1

# Check if ecosystem.config.js exists
if [ ! -f "ecosystem.config.js" ]; then
    echo "✗ File ecosystem.config.js tidak ditemukan"
    exit 1
fi

# Check current mode
CURRENT_MODE=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.exec_mode" 2>/dev/null || echo "unknown")

if [ "$CURRENT_MODE" = "cluster_mode" ]; then
    echo "✓ Aplikasi sudah dalam cluster mode"
    pm2 show "$APP_NAME" | grep -E "exec_mode|instances"
    exit 0
fi

echo "Current mode: $CURRENT_MODE"
echo "Switching to cluster mode..."
echo ""

# Stop and delete current instance
if pm2 list | grep -q "$APP_NAME"; then
    echo "Stopping current instance..."
    pm2 stop "$APP_NAME"
    pm2 delete "$APP_NAME"
fi

# Check .env for PM2_INSTANCES
if [ -f .env ]; then
    PM2_INSTANCES=$(grep "^PM2_INSTANCES=" .env | cut -d'=' -f2 || echo "max")
    echo "PM2_INSTANCES dari .env: $PM2_INSTANCES"
else
    PM2_INSTANCES="max"
    echo "PM2_INSTANCES: $PM2_INSTANCES (default)"
fi

# Start with cluster mode
echo ""
echo "Starting in cluster mode..."
pm2 start ecosystem.config.js --env production --update-env

# Wait a moment
sleep 2

# Check result
NEW_MODE=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.exec_mode" 2>/dev/null || echo "unknown")
INSTANCES=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.instances" 2>/dev/null || echo "unknown")

echo ""
echo "=========================================="
if [ "$NEW_MODE" = "cluster_mode" ]; then
    echo "✓ Berhasil switch ke cluster mode!"
    echo "  Mode: $NEW_MODE"
    echo "  Instances: $INSTANCES"
    echo ""
    pm2 save
    echo ""
    echo "Status:"
    pm2 status "$APP_NAME"
else
    echo "✗ Gagal switch ke cluster mode"
    echo "  Current mode: $NEW_MODE"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Cek file ecosystem.config.js:"
    echo "     cat ecosystem.config.js | grep -E 'exec_mode|instances'"
    echo ""
    echo "  2. Pastikan exec_mode: 'cluster' di ecosystem.config.js"
    echo ""
    echo "  3. Cek .env untuk PM2_INSTANCES:"
    echo "     grep PM2_INSTANCES .env"
    exit 1
fi
