#!/bin/bash

# Script untuk setup nginx configuration

DEPLOY_PATH="${1:-/var/www/iot-qr-consumer}"
NGINX_SITE="iot-qr-consumer"
DOMAIN="crs.moof-set.web.id"
APP_PORT="5567"

echo "=========================================="
echo "Setup Nginx untuk $DOMAIN"
echo "=========================================="
echo ""

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "✗ Nginx tidak terinstall"
    echo "  Install dengan: sudo apt install nginx"
    exit 1
fi

echo "✓ Nginx terinstall"
echo ""

# Check if config file exists
if [ ! -f "$DEPLOY_PATH/nginx.conf.example" ]; then
    echo "✗ File nginx.conf.example tidak ditemukan di $DEPLOY_PATH"
    exit 1
fi

echo "✓ File nginx.conf.example ditemukan"
echo ""

# Copy config
echo "Copying nginx configuration..."
sudo cp "$DEPLOY_PATH/nginx.conf.example" "/etc/nginx/sites-available/$NGINX_SITE"

# Replace placeholder if needed (should already be set, but just in case)
sudo sed -i "s/localhost:3000/localhost:$APP_PORT/g" "/etc/nginx/sites-available/$NGINX_SITE"
sudo sed -i "s/your-subdomain.example.com/$DOMAIN/g" "/etc/nginx/sites-available/$NGINX_SITE" 2>/dev/null || true

# Create symlink
if [ -L "/etc/nginx/sites-enabled/$NGINX_SITE" ]; then
    echo "✓ Symlink sudah ada"
else
    echo "Creating symlink..."
    sudo ln -s "/etc/nginx/sites-available/$NGINX_SITE" "/etc/nginx/sites-enabled/$NGINX_SITE"
    echo "✓ Symlink created"
fi

# Remove default nginx site if exists
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    echo ""
    echo "⚠️  Default nginx site ditemukan. Ingin disable? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        sudo rm /etc/nginx/sites-enabled/default
        echo "✓ Default site disabled"
    fi
fi

# Test nginx configuration
echo ""
echo "Testing nginx configuration..."
if sudo nginx -t; then
    echo "✓ Nginx configuration valid"
else
    echo "✗ Nginx configuration error!"
    echo "  Fix errors before reloading"
    exit 1
fi

# Reload nginx
echo ""
echo "Reloading nginx..."
if sudo systemctl reload nginx; then
    echo "✓ Nginx reloaded successfully"
else
    echo "✗ Failed to reload nginx"
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ Nginx setup completed!"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  Domain: $DOMAIN"
echo "  App Port: $APP_PORT"
echo "  Config: /etc/nginx/sites-available/$NGINX_SITE"
echo ""
echo "Next steps:"
echo "  1. Setup DNS A record untuk $DOMAIN"
echo "  2. Test: curl http://$DOMAIN"
echo "  3. Check logs: sudo tail -f /var/log/nginx/iot-qr-consumer-error.log"
echo ""
