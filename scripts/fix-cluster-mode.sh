#!/bin/bash

# Script untuk fix cluster mode - update file dan restart

APP_NAME="iot-qr-consumer"
DEPLOY_PATH="${1:-/var/www/iot-qr-consumer}"

echo "=========================================="
echo "Fix Cluster Mode untuk $APP_NAME"
echo "=========================================="
echo ""

cd "$DEPLOY_PATH" || exit 1

# Check current mode
CURRENT_MODE=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.exec_mode" 2>/dev/null || echo "unknown")

echo "Current mode: $CURRENT_MODE"
echo ""

# Check ecosystem.config.js
echo "Checking ecosystem.config.js..."
if grep -q "exec_mode: 'fork'" ecosystem.config.js; then
    echo "✗ File ecosystem.config.js masih versi lama (fork mode)"
    echo ""
    echo "Updating ecosystem.config.js..."
    
    # Backup original
    cp ecosystem.config.js ecosystem.config.js.backup
    
    # Update exec_mode
    sed -i "s/exec_mode: 'fork'/exec_mode: 'cluster'/g" ecosystem.config.js
    
    # Update instances if it's still 1
    if grep -q "instances: 1," ecosystem.config.js; then
        sed -i "s/instances: 1,/instances: process.env.PM2_INSTANCES || 'max',/g" ecosystem.config.js
    fi
    
    # Add instance_var if not exists
    if ! grep -q "instance_var:" ecosystem.config.js; then
        # Add after max_memory_restart
        sed -i "/max_memory_restart: '500M',/a\    // Instance vars untuk cluster mode\n    instance_var: 'INSTANCE_ID'," ecosystem.config.js
    fi
    
    echo "✓ File ecosystem.config.js updated"
    echo ""
    echo "Verifikasi:"
    cat ecosystem.config.js | grep -E "exec_mode|instances" | head -2
    echo ""
else
    echo "✓ File ecosystem.config.js sudah benar (cluster mode)"
fi

# Stop and delete current instance (force delete all)
if pm2 list | grep -q "$APP_NAME"; then
    echo "Stopping and deleting current instance(s)..."
    pm2 stop "$APP_NAME"
    pm2 delete "$APP_NAME" || true
    # Force delete all instances with same name
    pm2 delete "$APP_NAME" 2>/dev/null || true
    sleep 2
fi

# Get PM2_INSTANCES from .env
if [ -f .env ]; then
    PM2_INSTANCES=$(grep "^PM2_INSTANCES=" .env | cut -d'=' -f2 || echo "max")
    echo "PM2_INSTANCES dari .env: $PM2_INSTANCES"
else
    PM2_INSTANCES="max"
    echo "PM2_INSTANCES: $PM2_INSTANCES (default, .env tidak ada)"
fi

# Start with cluster mode
echo ""
echo "Starting in cluster mode..."
pm2 start ecosystem.config.js --env production --update-env

# Wait a moment
sleep 3

# Check result
NEW_MODE=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.exec_mode" 2>/dev/null || echo "unknown")
INSTANCES=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.instances" 2>/dev/null || echo "unknown")
INSTANCE_COUNT=$(pm2 list | grep "$APP_NAME" | wc -l)

echo ""
echo "=========================================="
if [ "$NEW_MODE" = "cluster_mode" ]; then
    echo "✓ Berhasil switch ke cluster mode!"
    echo "  Mode: $NEW_MODE"
    echo "  Instances: $INSTANCES"
    echo "  Running processes: $INSTANCE_COUNT"
    echo ""
    pm2 save
    echo ""
    echo "Status:"
    pm2 status "$APP_NAME"
else
    echo "✗ Masih gagal switch ke cluster mode"
    echo "  Current mode: $NEW_MODE"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Cek file ecosystem.config.js:"
    echo "     cat ecosystem.config.js | grep -E 'exec_mode|instances'"
    echo ""
    echo "  2. Pastikan exec_mode: 'cluster' (bukan 'fork')"
    echo ""
    echo "  3. Cek PM2 logs:"
    echo "     pm2 logs $APP_NAME --lines 20"
    exit 1
fi
