const express = require('express');
const { Pool } = require('pg');
const app = express();

const PORT = process.env.PORT || 3003;
const PG_URI = process.env.DB_URI || 'postgresql://postgres:password@order-db:5432/order_db';
const DB_INFO = {
  engine: 'PostgreSQL 15 (order_db:5432)',
  volume: 'order_data (/var/lib/postgresql/data)',
  broker: 'RabbitMQ (devops_rabbitmq:5672)',
  uri: PG_URI,
  status: 'CONNECTED'
};

app.use(express.json());
const pool = new Pool({ connectionString: PG_URI });

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(50) PRIMARY KEY,
      user_id INTEGER,
      customer VARCHAR(255) NOT NULL,
      date VARCHAR(100),
      total BIGINT DEFAULT 0,
      payment_method VARCHAR(255),
      status VARCHAR(50),
      items JSONB DEFAULT '[]'::jsonb,
      steps JSONB DEFAULT '[]'::jsonb,
      saga_steps JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const { rows } = await pool.query('SELECT COUNT(*) FROM orders');
  if (Number(rows[0].count) === 0) {
    await pool.query(
      `INSERT INTO orders (id, user_id, customer, date, total, payment_method, status, items, steps)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        'ORD-9021', 1, 'Văn Hải', '2026-11-18 20:15', 16550000, 'VNPay QR / Chuyển khoản', 'COMPLETED',
        JSON.stringify([
          { productId: 'prod-1', name: 'Mini PC Homelab Cluster Node i7-13700H (64GB RAM)', quantity: 1 },
          { productId: 'prod-8', name: 'Khóa Bảo Mật Phần Cứng FIDO2 / SSH Hardware Token', quantity: 1 }
        ]),
        JSON.stringify(['ORDER_CREATED', 'INVENTORY_RESERVED', 'PAYMENT_SETTLED', 'SHIPPING_DISPATCHED'])
      ]
    );
  }
  console.log('Connected to PostgreSQL (order_db) & table orders ready');
}

function mapRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    customer: r.customer,
    date: r.date,
    total: Number(r.total),
    paymentMethod: r.payment_method,
    status: r.status,
    items: r.items,
    steps: r.steps,
    sagaSteps: r.saga_steps
  };
}

async function getAllOrders() {
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  return rows.map(mapRow);
}

app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/', async (req, res) => {
  res.json({ service: 'order-service', status: 'running', port: PORT, database: DB_INFO, orders: await getAllOrders() });
});

app.get('/db', async (req, res) => {
  res.json({ service: 'order-service', database: DB_INFO, ordersTable: await getAllOrders() });
});

const handleSagaCheckout = async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const total = Number(req.body?.total) || 0;
  const paymentMethod = req.body?.paymentMethod || req.body?.payment || 'VNPay QR / Chuyển khoản';
  let customer = req.body?.customer || 'Khách hàng';
  let userId = null;

  if (req.headers.authorization) {
    try {
      const authResp = await fetch('http://auth-service:3006/verify', { headers: { Authorization: req.headers.authorization } });
      if (!authResp.ok) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
      const authData = await authResp.json();
      if (authData.user) {
        userId = authData.user.userId;
        if (!req.body?.customer) customer = authData.user.username;
      }
    } catch (err) {
      return res.status(502).json({ error: 'Không thể kết nối auth-service để xác thực', details: err.message });
    }
  }

  let inventoryReserved = false;
  const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);

  try {
    const inventoryResp = await fetch('http://product-service:3001/reserve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items })
    });
    const inventoryData = await inventoryResp.json().catch(() => ({}));
    if (!inventoryResp.ok) return res.status(inventoryResp.status).json({ service: 'order-service', error: inventoryData.error || 'Inventory reservation failed' });
    inventoryReserved = true;

    const paymentResp = await fetch('http://payment-service:3004/charge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, amount: total, method: paymentMethod })
    });
    const paymentData = await paymentResp.json().catch(() => ({}));
    if (!paymentResp.ok) throw new Error(paymentData.error || `Payment service returned ${paymentResp.status}`);

    if (req.headers.authorization) {
      await fetch('http://cart-service:3002/items', { method: 'DELETE', headers: { Authorization: req.headers.authorization } }).catch(() => {});
    }

    const steps = ['ORDER_CREATED', 'INVENTORY_RESERVED', 'PAYMENT_SETTLED', 'SHIPPING_DISPATCHED'];
    const sagaSteps = {
      step1_inventory: inventoryData.status,
      step1_db: inventoryData.database?.engine,
      step2_payment: paymentData.status,
      step2_db: paymentData.database?.engine,
      transactionId: paymentData.transactionId
    };
    const dateStr = new Date().toLocaleString('vi-VN');

    await pool.query(
      `INSERT INTO orders (id, user_id, customer, date, total, payment_method, status, items, steps, saga_steps)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [orderId, userId, customer, dateStr, total, paymentMethod, 'SAGA_CONFIRMED', JSON.stringify(items), JSON.stringify(steps), JSON.stringify(sagaSteps)]
    );

    res.status(201).json({
      service: 'order-service',
      database: DB_INFO,
      message: 'Saga Checkout thành công',
      order: { id: orderId, userId, customer, date: dateStr, total, paymentMethod, status: 'SAGA_CONFIRMED', items, steps, sagaSteps }
    });
  } catch (err) {
    if (inventoryReserved && items.length > 0) {
      await fetch('http://product-service:3001/release', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items })
      }).catch(() => {});
    }
    res.status(502).json({ service: 'order-service', error: 'Saga Transaction Failed (Rolled back)', details: err.message });
  }
};

app.post('/checkout', handleSagaCheckout);
app.post('/', handleSagaCheckout);

app.use(async (req, res) => {
  res.status(200).json({ service: 'order-service', database: DB_INFO, handledPath: req.originalUrl, orders: await getAllOrders() });
});

initDB()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Order Service is running on port ${PORT}`)))
  .catch((err) => { console.error('Order DB init failed:', err); process.exit(1); });
