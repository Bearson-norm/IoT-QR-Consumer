// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  apps: [{
    name: 'iot-qr-consumer',
    script: './server.js',
    // Read PM2_INSTANCES from environment (from .env file via dotenv)
    // If PM2_INSTANCES is 'max', use 'max', otherwise parse as integer
    instances: process.env.PM2_INSTANCES ? 
      (process.env.PM2_INSTANCES.toLowerCase() === 'max' ? 'max' : parseInt(process.env.PM2_INSTANCES) || 'max') : 
      'max', // Default: 'max' untuk semua CPU cores
    exec_mode: 'cluster', // Cluster mode untuk load balancing
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    // Instance vars untuk cluster mode
    instance_var: 'INSTANCE_ID',
    env: {
      NODE_ENV: 'development',
      PORT: process.env.PORT || 5567
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 5567
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
