const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('CRITICAL: DATABASE_URL environment variable is missing.');
  process.exit(1);
}

// SQL schema scripts
const createTablesQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS links (
    id SERIAL PRIMARY KEY,
    destination_url TEXT NOT NULL,
    short_code VARCHAR(50) NOT NULL,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    qr_image TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clicks (
    id SERIAL PRIMARY KEY,
    link_id INTEGER REFERENCES links(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device VARCHAR(50),
    browser VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

async function setupDatabase() {
  // 1. Parse database name and construct fallback connection to default 'postgres' database
  // Match username, password, host, port, dbname from URL
  const match = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:/]+):?([0-9]*)\/(.+)/);
  if (!match) {
    console.error('Invalid DATABASE_URL format.');
    process.exit(1);
  }

  const [_, user, password, host, port, dbName] = match;
  const postgresDbUrl = `postgresql://${user}:${password}@${host}:${port || 5432}/postgres`;

  console.log(`Connecting to server to verify database "${dbName}"...`);
  
  // Connect to 'postgres' default database first
  const adminClient = new Client({ connectionString: postgresDbUrl });
  try {
    await adminClient.connect();
    
    // Check if the target database exists
    const checkDbRes = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (checkDbRes.rows.length === 0) {
      console.log(`Database "${dbName}" not found. Creating database...`);
      // CREATE DATABASE cannot run inside a transaction block, so we run it directly on the client
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created successfully!`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('Failed to verify/create database:', err.message);
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  // 2. Connect to the target 'referrallink' database and run schema/seed query
  console.log(`Connecting to database "${dbName}" to initialize schemas...`);
  const targetClient = new Client({ connectionString });
  
  try {
    await targetClient.connect();
    
    // Create tables
    await targetClient.query(createTablesQuery);
    console.log('Tables initialized successfully.');

    // Check and seed admin user
    const checkUserRes = await targetClient.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(checkUserRes.rows[0].count, 10);

    if (userCount === 0) {
      console.log('Seeding default admin user...');
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@referrallink.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await targetClient.query(
        'INSERT INTO users (email, password) VALUES ($1, $2)',
        [adminEmail, hashedPassword]
      );
      console.log(`Admin user created: ${adminEmail}`);
    } else {
      console.log('Admin user already exists. Skipping seeding.');
    }

    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error during database schema initialization:', error.message);
    process.exit(1);
  } finally {
    await targetClient.end();
  }
}

setupDatabase();
