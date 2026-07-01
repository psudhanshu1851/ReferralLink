const bcrypt = require('bcryptjs');
const { pool } = require('./db');
require('dotenv').config();

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
  console.log('Connecting to database and initializing schema...');
  const client = await pool.connect();
  try {
    // 1. Create tables
    await client.query(createTablesQuery);
    console.log('Tables created successfully (or already existed).');

    // 2. Check and seed admin user
    const checkUserRes = await client.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(checkUserRes.rows[0].count, 10);

    if (userCount === 0) {
      console.log('Seeding default admin user...');
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@referrallink.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await client.query(
        'INSERT INTO users (email, password) VALUES ($1, $2)',
        [adminEmail, hashedPassword]
      );
      console.log(`Admin user created: ${adminEmail}`);
    } else {
      console.log('Admin user already exists. Skipping seeding.');
    }

    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error during database setup:', error.message);
    console.error('\nPlease verify your database connection URI in the .env file.');
    console.error('If the database does not exist, you must create it in PostgreSQL first (e.g., CREATE DATABASE referrallink;).');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
