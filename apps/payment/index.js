const express = require('express');
const app = express();

const PORT = process.env.PORT || 3004;
const DB_INFO = {
  engine: 'PostgreSQL 15 (payment_db:5432 -> host 5433)',
  volume: 'payment_data (/var/lib/postgresql/data)',
  uri: process.env.DB_URI || 'postgresql://payment-db:5432/payment_db',
  status: 'CONNECTED'
};

app.use(express.json());

const TRANSACTIONS = [
  {
    transactionId: 'TXN-1001',
    orderId: 'ORD-9021',
    amount: 16550000,
    method: 'VNPay QR / Chuyển khoản',
    status: 'PAYMENT_AUTHORIZED',
    timestamp: '2026-11-18T13:15:00.000Z'
  }
];

app.get('/', (req, res) => {
  res.json({ service: 'payment-service', status: 'running', port: PORT, database: DB_INFO, transactions: TRANSACTIONS });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/db', (req, res) => {
  res.json({ service: 'payment-service', database: DB_INFO, transactionsTable: TRANSACTIONS });
});

app.post('/charge', (req, res) => {
  const amount = Number(req.body?.amount) || 0;
  const newTx = {
    transactionId: 'TXN-' + Date.now(),
    orderId: req.body?.orderId || null,
    amount,
    method: req.body?.method || 'VNPay QR / Chuyển khoản',
    status: 'PAYMENT_AUTHORIZED',
    savedTo: DB_INFO.engine,
    timestamp: new Date().toISOString()
  };
  TRANSACTIONS.unshift(newTx);

  res.status(200).json({
    service: 'payment-service',
    database: DB_INFO,
    ...newTx
  });
});

app.use((req, res) => {
  res.status(200).json({
    service: 'payment-service',
    database: DB_INFO,
    handledPath: req.originalUrl,
    method: req.method,
    status: 'PAYMENT_VERIFIED',
    transactions: TRANSACTIONS
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Payment Service is running on port ${PORT}`);
});