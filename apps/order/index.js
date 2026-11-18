const express = require('express');
const app = express();

const PORT = process.env.PORT || 3003;
const DB_INFO = {
  engine: 'PostgreSQL 15 (order_db:5432)',
  volume: 'order_data (/var/lib/postgresql/data)',
  broker: 'RabbitMQ (devops_rabbitmq:5672)',
  uri: process.env.DB_URI || 'postgresql://order-db:5432/order_db',
  status: 'CONNECTED'
};

app.use(express.json());

const ORDERS = [
  {
    id: 'ORD-9021',
    userId: 1,
    customer: 'Văn Hải',
    date: '2026-11-18 20:15',
    total: 16550000,
    paymentMethod: 'VNPay QR / Chuyển khoản',
    status: 'COMPLETED',
    items: [
      { productId: 'prod-1', name: 'Mini PC Homelab Cluster Node i7-13700H (64GB RAM)', quantity: 1 },
      { productId: 'prod-8', name: 'Khóa Bảo Mật Phần Cứng FIDO2 / SSH Hardware Token', quantity: 1 }
    ],
    steps: ['ORDER_CREATED', 'INVENTORY_RESERVED', 'PAYMENT_SETTLED', 'SHIPPING_DISPATCHED']
  }
];

app.get('/', (req, res) => {
  res.json({ service: 'order-service', status: 'running', port: PORT, database: DB_INFO, orders: ORDERS });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/db', (req, res) => {
  res.json({ service: 'order-service', database: DB_INFO, ordersTable: ORDERS });
});

const handleSagaCheckout = async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const total = Number(req.body?.total) || 0;
  const paymentMethod = req.body?.paymentMethod || req.body?.payment || 'VNPay QR / Chuyển khoản';
  let customer = req.body?.customer || 'Khách hàng';
  let userId = null;

  // Bước 0: Xác thực JWT nếu có header Authorization
  if (req.headers.authorization) {
    try {
      const authResp = await fetch('http://auth-service:3006/verify', {
        headers: { Authorization: req.headers.authorization }
      });
      if (!authResp.ok) {
        return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
      }
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

  try {
    // Bước 1: Giữ tồn kho qua product-service
    const inventoryResp = await fetch('http://product-service:3001/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    const inventoryData = await inventoryResp.json().catch(() => ({}));
    if (!inventoryResp.ok) {
      return res.status(inventoryResp.status).json({
        service: 'order-service',
        error: inventoryData.error || 'Inventory reservation failed'
      });
    }
    inventoryReserved = true;

    // Bước 2: Thanh toán qua payment-service
    const paymentResp = await fetch('http://payment-service:3004/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: total, method: paymentMethod })
    });
    const paymentData = await paymentResp.json().catch(() => ({}));
    if (!paymentResp.ok) {
      throw new Error(paymentData.error || `Payment service returned ${paymentResp.status}`);
    }

    // Bước 3: Xóa giỏ hàng Redis của user nếu đã đăng nhập
    if (req.headers.authorization) {
      await fetch('http://cart-service:3002/items', {
        method: 'DELETE',
        headers: { Authorization: req.headers.authorization }
      }).catch(() => {});
    }

    const newOrder = {
      id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
      userId,
      customer,
      date: new Date().toLocaleString('vi-VN'),
      total,
      paymentMethod,
      status: 'SAGA_CONFIRMED',
      items,
      steps: ['ORDER_CREATED', 'INVENTORY_RESERVED', 'PAYMENT_SETTLED', 'SHIPPING_DISPATCHED'],
      savedTo: DB_INFO.engine,
      sagaSteps: {
        step1_inventory: inventoryData.status,
        step1_db: inventoryData.database?.engine,
        step2_payment: paymentData.status,
        step2_db: paymentData.database?.engine,
        transactionId: paymentData.transactionId
      }
    };
    ORDERS.unshift(newOrder);

    res.status(201).json({
      service: 'order-service',
      database: DB_INFO,
      message: 'Saga Checkout thành công',
      order: newOrder
    });
  } catch (err) {
    // Saga Compensation: Hoàn lại tồn kho nếu bước 1 đã trừ nhưng bước 2 thất bại
    if (inventoryReserved && items.length > 0) {
      await fetch('http://product-service:3001/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      }).catch(() => {});
    }

    res.status(502).json({
      service: 'order-service',
      error: 'Saga Transaction Failed (Rolled back)',
      details: err.message
    });
  }
};

app.post('/checkout', handleSagaCheckout);
app.post('/', handleSagaCheckout);

app.use((req, res) => {
  res.status(200).json({
    service: 'order-service',
    database: DB_INFO,
    handledPath: req.originalUrl,
    orders: ORDERS
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Order Service is running on port ${PORT}`);
});