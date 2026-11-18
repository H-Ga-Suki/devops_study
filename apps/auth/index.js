const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3006;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_devops_key_123';

const pool = new Pool({
  connectionString: process.env.DB_URI || 'postgres://postgres:postgres@auth-db:5432/auth_db'
});

// Tự động tạo bảng users với retry để tránh lỗi race condition khi Postgres mới khởi động
async function initDB(retries = 10, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'BUYER'
        )
      `);
      console.log('Database users table initialized.');
      return;
    } catch (err) {
      console.error(`Database initialization attempt ${i}/${retries} failed:`, err.message);
      if (i < retries) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
initDB();

// API Đăng ký
app.post('/register', async (req, res) => {
  try {
    const username = (req.body?.username || '').trim();
    const password = req.body?.password || '';
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, role',
      [username, hashedPassword]
    );

    res.status(201).json({ message: 'User created successfully', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// API Đăng nhập
app.post('/login', async (req, res) => {
  try {
    const username = (req.body?.username || '').trim();
    const password = req.body?.password || '';
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = { userId: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({ message: 'Login successful', token, user: payload });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// API Xác thực Token
app.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.status(200).json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Token expired or invalid' });
  }
});

app.get('/health', (req, res) => res.status(200).send('OK'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth Service is running on port ${PORT}`);
});