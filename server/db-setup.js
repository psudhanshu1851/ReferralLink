const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const client = new Client({
 connectionString: process.env.DATABASE_URL,
 ssl: {
   rejectUnauthorized: false
 }
});

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

async function setup() {

 await client.connect();

 await client.query(createTablesQuery);

 const result = await client.query(
   'SELECT COUNT(*) FROM users'
 );

 if (parseInt(result.rows[0].count) === 0) {

   const hashed = await bcrypt.hash(
     process.env.ADMIN_PASSWORD,
     10
   );

   await client.query(
   `INSERT INTO users(email,password)
    VALUES($1,$2)`,
   [
      process.env.ADMIN_EMAIL,
      hashed
   ]);

 }

 console.log("Database initialized");

 await client.end();

}

setup();
