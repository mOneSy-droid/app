import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const username = 'admin';
const email = 'admin@eduvisa.uz';

try {
  await pool.query('DELETE FROM password_reset_request_log WHERE username = $1', [username]);
  for (let i = 0; i < 5; i += 1) {
    await pool.query('INSERT INTO password_reset_request_log (username) VALUES ($1)', [username]);
  }

  const response = await fetch('http://127.0.0.1:3000/api/auth/reset-password/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email }),
  });

  const text = await response.text();
  console.log('status', response.status);
  console.log(text);
} finally {
  await pool.end();
}
