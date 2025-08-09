// backend/create_admin.js
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
const username = 'admin';
const password = 'admin123'; // cámbialo luego

async function run() {
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
  console.log('Admin creado');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
