const express = require('express');
const { Pool } = require('pg');
const app = express();

const PORT = process.env.PORT || 3004;
const PG_URI = process.env.DB_URI || 'postgresql://postgres:password@payment-db:5432/payment_db';
const DB_INFO = {
  engine: 'PostgreSQL 15 (payment_db:5432 -> host 5433)',
  volume: 'payment_data (/var/lib/postgresql/data)',
  uri: PG_URI,
  status: 'CONNECTED'
};

app.use(express.json());
const pool = new Pool({ connectionString: PG_URI });

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      transaction_id VARCHAR(60) PRIMARY KEY,
      order_id VARCHAR(50),
      amount BIGINT DEFAULT 0,
      method VARCHAR(255),
      status VARCHAR(50),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const { rows } = await pool.query('SELECT COUNT(*) FROM payments');
  if (Number(rows[0].count) === 0) {
    await pool.query(
      `INSERT INTO payments (transaction_id, order_id, amount, method, status)
       VALUES ($1,$2,$3,$4,$5)`,
      ['TXN-1001', 'ORD-9021', 16550000, 'VNPay QR / Chuyển khoản', 'PAYMENT_AUTHORIZED']
    );
  }
  console.log('Connected to PostgreSQL (payment_db) & table payments ready');
}

function mapRow(r) {
  return {
    transactionId: r.transaction_id,
    orderId: r.order_id,
    amount: Number(r.amount),
    method: r.method,
    status: r.status,
    timestamp: r.timestamp
  };
}

async function getAllPayments() {
  const { rows } = await pool.query('SELECT * FROM payments ORDER BY timestamp DESC');
  return rows.map(mapRow);
}

app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/', async (req, res) => {
  res.json({ service: 'payment-service', status: 'running', port: PORT, database: DB_INFO, transactions: await getAllPayments() });
});

app.get('/db', async (req, res) => {
  res.json({ service: 'payment-service', database: DB_INFO, transactionsTable: await getAllPayments() });
});

app.post('/charge', async (req, res) => {
  const transactionId = 'TXN-' + Date.now();
  const orderId = req.body?.orderId || null;
  const amount = Number(req.body?.amount) || 0;
  const method = req.body?.method || 'VNPay QR / Chuyển khoản';
  const status = 'PAYMENT_AUTHORIZED';

  await pool.query(
    `INSERT INTO payments (transaction_id, order_id, amount, method, status)
     VALUES ($1,$2,$3,$4,$5)`,
    [transactionId, orderId, amount, method, status]
  );

  res.status(200).json({
    service: 'payment-service',
    database: DB_INFO,
    transactionId,
    orderId,
    amount,
    method,
    status,
    timestamp: new Date().toISOString()
  });
});

app.use(async (req, res) => {
  res.status(200).json({ service: 'payment-service', database: DB_INFO, handledPath: req.originalUrl, method: req.method, status: 'PAYMENT_VERIFIED', transactions: await getAllPayments() });
});

initDB()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Payment Service is running on port ${PORT}`)))
  .catch((err) => { console.error('Payment DB init failed:', err); process.exit(1); });
