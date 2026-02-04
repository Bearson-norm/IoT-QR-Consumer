#!/bin/bash

# Deployment script untuk VPS
# Script ini dijalankan setelah rsync selesai

set -e

DEPLOY_PATH="${1:-/var/www/iot-qr-consumer}"
APP_NAME="iot-qr-consumer"

echo "=========================================="
echo "Deploying $APP_NAME to $DEPLOY_PATH"
echo "=========================================="

# Navigate to deployment directory
cd "$DEPLOY_PATH" || exit 1

# Fix ownership and permissions (if needed)
if [ -w "$DEPLOY_PATH" ]; then
    # Try to fix ownership (may require sudo)
    sudo chown -R "$(whoami):$(whoami)" "$DEPLOY_PATH" 2>/dev/null || \
    chown -R "$(whoami):$(whoami)" "$DEPLOY_PATH" 2>/dev/null || true
    
    # Fix permissions
    chmod 755 "$DEPLOY_PATH" 2>/dev/null || true
    chmod -R 755 "$DEPLOY_PATH/scripts" 2>/dev/null || true
    chmod -R 644 "$DEPLOY_PATH/scripts"/*.js 2>/dev/null || true
    chmod -R 755 "$DEPLOY_PATH/scripts"/*.sh 2>/dev/null || true
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "WARNING: .env file not found!"
    echo ""
    
    # Check if .env.example exists
    if [ -f .env.example ]; then
        echo "Creating .env from .env.example template..."
        cp .env.example .env
        echo "✓ .env file created from template"
        echo ""
        echo "⚠️  IMPORTANT: Please edit .env file and update with your actual values:"
        echo "   nano $DEPLOY_PATH/.env"
        echo ""
        echo "Required values to update:"
        echo "  - DB_PASSWORD: Your PostgreSQL password"
        echo "  - DB_PORT: Your PostgreSQL port (default: 5433)"
        echo "  - Other database credentials if different from defaults"
        echo ""
        echo "After updating .env, deployment will continue on next push."
        echo "For now, using default values from .env.example..."
    else
        echo "ERROR: .env file not found and .env.example template is also missing!"
        echo ""
        echo "Please create .env file manually with the following structure:"
        echo ""
        echo "  PORT=3000"
        echo "  NODE_ENV=production"
        echo "  DB_HOST=localhost"
        echo "  DB_PORT=5433"
        echo "  DB_USER=admin"
        echo "  DB_PASSWORD=your_password_here"
        echo "  DB_NAME=iot_qr_consumer"
        echo ""
        echo "Create it with: nano $DEPLOY_PATH/.env"
        exit 1
    fi
fi

# Install/update dependencies
echo "Installing dependencies..."
npm ci --production

# Verify database connection before starting
echo "Verifying database connection..."
if [ -f "scripts/verify-db-connection.js" ]; then
    node scripts/verify-db-connection.js || {
        echo ""
        echo "⚠️  Database connection verification failed!"
        echo "   Please check your .env file and database setup."
        echo "   Run: node scripts/verify-db-connection.js"
        echo ""
        echo "   Continuing deployment anyway, but application may not start correctly."
    }
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Check if app is already running
if pm2 list | grep -q "$APP_NAME"; then
    echo "Application is running. Checking for changes..."
    
    # Check if restart is needed
    if [ -f "scripts/check-changes.sh" ]; then
        chmod +x scripts/check-changes.sh
        if ./scripts/check-changes.sh; then
            echo "Restart required. Restarting application..."
            pm2 restart "$APP_NAME" --update-env
        else
            echo "No restart needed. Reloading application..."
            pm2 reload "$APP_NAME" --update-env || pm2 restart "$APP_NAME" --update-env
        fi
    else
        # Default: restart if check script doesn't exist
        echo "Restarting application (default behavior)..."
        pm2 restart "$APP_NAME" --update-env
    fi
else
    echo "Application not running. Starting application..."
    pm2 start ecosystem.config.js --env production --update-env
    pm2 save
fi

# Show status
echo ""
echo "=========================================="
echo "Deployment Status:"
echo "=========================================="
pm2 status "$APP_NAME"
pm2 logs "$APP_NAME" --lines 10 --nostream

echo ""
echo "Deployment completed successfully!"
