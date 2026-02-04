// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

// PostgreSQL connection configuration
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'iot_qr_consumer',
  // Connection pool settings
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Create a wrapper that mimics SQLite API for compatibility
class PostgreSQLWrapper {
  constructor(pool) {
    this.pool = pool;
  }

  // Convert SQLite placeholders (?) to PostgreSQL placeholders ($1, $2, ...)
  convertPlaceholders(sql) {
    let paramIndex = 1;
    return sql.replace(/\?/g, () => `$${paramIndex++}`);
  }
  
  // Handle array parameters for PostgreSQL (for ANY(array) syntax)
  prepareParams(params) {
    // If params is an array and contains arrays, we need to handle them specially
    // For now, just return params as-is since PostgreSQL pg library handles arrays
    return params;
  }

  // db.get() - Get single row
  get(sql, params = [], callback) {
    const convertedSql = this.convertPlaceholders(sql);
    
    this.pool.query(convertedSql, params)
      .then(result => {
        const row = result.rows[0] || null;
        callback(null, row);
      })
      .catch(err => {
        callback(err, null);
      });
  }

  // db.all() - Get all rows
  all(sql, params = [], callback) {
    try {
      const convertedSql = this.convertPlaceholders(sql);
      const preparedParams = this.prepareParams(params);
      
      this.pool.query(convertedSql, preparedParams)
        .then(result => {
          callback(null, result.rows || []);
        })
        .catch(err => {
          console.error('Database query error:', err.message);
          console.error('SQL:', convertedSql);
          console.error('Params:', preparedParams);
          callback(err, null);
        });
    } catch (error) {
      console.error('Error in db.all():', error);
      callback(error, null);
    }
  }

  // db.run() - Execute INSERT/UPDATE/DELETE
  run(sql, params = [], callback) {
    let convertedSql = this.convertPlaceholders(sql);
    
    // For INSERT statements, try to add RETURNING id to get the last inserted ID
    // Only if the INSERT doesn't already have RETURNING clause
    const isInsert = /^\s*INSERT\s+/i.test(sql.trim());
    let shouldReturnId = false;
    
    if (isInsert && !/RETURNING/i.test(convertedSql)) {
      // Check if INSERT includes id column (tables with SERIAL id)
      // Tables that have id: scan_records, users, ovt_permissions
      // Tables without id: employee_data (uses employee_id as PK)
      const hasIdColumn = /INSERT\s+INTO\s+(scan_records|users|ovt_permissions)/i.test(convertedSql);
      if (hasIdColumn) {
        convertedSql = convertedSql.replace(/;?\s*$/, '') + ' RETURNING id';
        shouldReturnId = true;
      }
    }
    
    this.pool.query(convertedSql, params)
      .then(result => {
        // Create a context object similar to SQLite's this context
        const lastID = shouldReturnId && result.rows[0] ? result.rows[0].id : null;
        const context = {
          lastID: lastID,
          changes: result.rowCount || 0
        };
        
        if (callback) {
          // Bind context to callback (mimic SQLite behavior)
          callback.call(context, null);
        }
      })
      .catch(err => {
        if (callback) {
          callback(err);
        }
      });
  }

  // db.prepare() - Prepare statement (for batch inserts)
  prepare(sql) {
    const convertedSql = this.convertPlaceholders(sql);
    let paramIndex = 0;
    
    return {
      run: (params, callback) => {
        this.run(convertedSql, params, callback);
      },
      finalize: (callback) => {
        if (callback) callback(null);
      }
    };
  }

  // Close connection
  close(callback) {
    this.pool.end()
      .then(() => {
        if (callback) callback(null);
      })
      .catch(err => {
        if (callback) callback(err);
      });
  }
}

// Create database wrapper instance
const db = new PostgreSQLWrapper(pool);

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create employee_data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_data (
        employee_id VARCHAR(255) PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
    console.log('employee_data table ready');
    
    // Check if table is empty and insert sample data
    const countResult = await pool.query('SELECT COUNT(*) as count FROM employee_data');
    if (parseInt(countResult.rows[0].count) === 0) {
      await insertSampleEmployees();
    }

    // Create scan_records table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_records (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(255) NOT NULL,
        scan_date DATE NOT NULL,
        scan_type VARCHAR(50) NOT NULL,
        scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employee_data(employee_id)
      )
    `);
    console.log('scan_records table ready');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('users table ready');
    
    // Check if users table is empty and insert default user
    const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(userCountResult.rows[0].count) === 0) {
      await insertDefaultUser();
    }
    
    // Insert additional OVT users if they don't exist
    await insertAdditionalUsers();

    // Create ovt_permissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ovt_permissions (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(255) NOT NULL,
        permission_date DATE NOT NULL,
        granted_by VARCHAR(255) NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employee_data(employee_id),
        UNIQUE(employee_id, permission_date)
      )
    `);
    console.log('ovt_permissions table ready');

  } catch (err) {
    console.error('Error initializing database:', err.message);
    throw err;
  }
}

// Insert default admin user
async function insertDefaultUser() {
  let bcrypt;
  try {
    bcrypt = require('bcryptjs');
  } catch (error) {
    console.warn('bcryptjs not found. Using plain text password (NOT SECURE). Please run: npm install');
    // For development only - insert plain password
    try {
      await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2)',
        ['admin', 'admin123']
      );
      console.log('Default user created (username: admin, password: admin123) - PLAIN TEXT');
    } catch (err) {
      console.error('Error inserting default user:', err.message);
    }
    return;
  }

  // Hash password with bcrypt
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  
  try {
    await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2)',
      ['admin', defaultPassword]
    );
    console.log('Default user created (username: admin, password: admin123)');
  } catch (err) {
    console.error('Error inserting default user:', err.message);
  }
}

// Insert additional OVT approval users
async function insertAdditionalUsers() {
  const ovtUsers = [
    'production',
    'warehouse',
    'logistic',
    'maintenance',
    'rnd',
    'finance',
    'qc'
  ];

  let bcrypt;
  try {
    bcrypt = require('bcryptjs');
  } catch (error) {
    console.warn('bcryptjs not found. Skipping OVT users creation.');
    return;
  }

  try {
    for (const username of ovtUsers) {
      const password = `${username}123`;
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Check if user already exists
      const checkResult = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (checkResult.rows.length === 0) {
        // Insert new user only if doesn't exist
        await pool.query(
          'INSERT INTO users (username, password) VALUES ($1, $2)',
          [username, hashedPassword]
        );
        console.log(`OVT user created: ${username}`);
      }
    }
  } catch (err) {
    console.error('Error inserting additional users:', err.message);
  }
}

// Insert sample employees
async function insertSampleEmployees() {
  const employees = [
    ['EMP001', 'John Doe'],
    ['EMP002', 'Jane Smith'],
    ['EMP003', 'Bob Johnson'],
    ['EMP004', 'Alice Williams'],
    ['EMP005', 'Charlie Brown']
  ];

  try {
    for (const emp of employees) {
      await pool.query(
        'INSERT INTO employee_data (employee_id, name) VALUES ($1, $2) ON CONFLICT (employee_id) DO NOTHING',
        emp
      );
    }
    console.log('Sample employees inserted');
  } catch (err) {
    console.error('Error inserting sample employees:', err.message);
  }
}

// Initialize database on startup
initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Get database instance
function getDB() {
  return db;
}

// Close database connection
function closeDB() {
  return db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
  });
}

module.exports = {
  getDB,
  closeDB,
  pool // Export pool for direct queries if needed
};
