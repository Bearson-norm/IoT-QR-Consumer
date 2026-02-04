#!/bin/bash

# Script untuk cek PM2 cluster configuration dan resource usage

echo "=========================================="
echo "PM2 Cluster Status Check"
echo "=========================================="
echo ""

# Check PM2 version
if ! command -v pm2 &> /dev/null; then
    echo "✗ PM2 tidak terinstall"
    exit 1
fi

echo "PM2 Version:"
pm2 --version
echo ""

# Check CPU cores
CPU_CORES=$(nproc)
echo "CPU Cores Available: $CPU_CORES"
echo ""

# Check all PM2 processes
echo "All PM2 Processes:"
pm2 list
echo ""

# Check cluster processes
echo "Cluster Mode Processes:"
pm2 jlist | jq -r '.[] | select(.pm2_env.exec_mode == "cluster_mode") | "\(.name): \(.pm2_env.instances) instances"' 2>/dev/null || \
pm2 list | grep -i cluster || echo "  (No cluster processes found or jq not installed)"
echo ""

# Check resource usage
echo "Resource Usage:"
pm2 monit --no-interaction &
MONIT_PID=$!
sleep 3
kill $MONIT_PID 2>/dev/null || true

echo ""
echo "Memory Usage per Process:"
pm2 jlist | jq -r '.[] | "\(.name): \(.monit.memory / 1024 / 1024 | floor)MB"' 2>/dev/null || \
echo "  (Install jq for detailed stats: sudo apt install jq)"
echo ""

# Check iot-qr-consumer specifically
if pm2 list | grep -q "iot-qr-consumer"; then
    echo "=========================================="
    echo "iot-qr-consumer Status:"
    echo "=========================================="
    pm2 show iot-qr-consumer | grep -E "exec_mode|instances|status|uptime|memory|cpu"
    echo ""
    
    INSTANCES=$(pm2 jlist | jq -r '.[] | select(.name=="iot-qr-consumer") | .pm2_env.instances' 2>/dev/null || echo "unknown")
    EXEC_MODE=$(pm2 jlist | jq -r '.[] | select(.name=="iot-qr-consumer") | .pm2_env.exec_mode' 2>/dev/null || echo "unknown")
    
    echo "Configuration:"
    echo "  Exec Mode: $EXEC_MODE"
    echo "  Instances: $INSTANCES"
    echo ""
    
    if [ "$EXEC_MODE" = "cluster_mode" ]; then
        echo "✓ Running in CLUSTER mode"
        echo "  Instances: $INSTANCES"
    else
        echo "⚠️  Running in FORK mode (not cluster)"
    fi
else
    echo "✗ iot-qr-consumer tidak running"
fi

echo ""
echo "=========================================="
echo "Recommendations:"
echo "=========================================="
echo ""
echo "Jika ada process lain yang menggunakan cluster:"
echo "  1. Set PM2_INSTANCES di .env untuk limit instances"
echo "  2. Contoh: PM2_INSTANCES=2 (untuk 2 instances saja)"
echo ""
echo "Untuk melihat semua cluster processes:"
echo "  pm2 list | grep cluster"
echo ""
