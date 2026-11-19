const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

// Cho phép Frontend gọi sang Gateway
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const SERVICES = {
  catalog:   { name: 'product-service', url: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3001' },
  products:  { name: 'product-service', url: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3001' },
  inventory: { name: 'product-service', url: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3001' },
  cart:      { name: 'cart-service',    url: process.env.CART_SERVICE_URL    || 'http://cart-service:3002' },
  orders:    { name: 'order-service',   url: process.env.ORDER_SERVICE_URL   || 'http://order-service:3003' },
  payments:  { name: 'payment-service', url: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3004' },
  auth:      { name: 'auth-service',    url: process.env.AUTH_SERVICE_URL    || 'http://auth-service:3006' }
};

app.get('/', (req, res) => {
  res.json({ message: 'API Gateway is running', port: PORT, services: Object.keys(SERVICES) });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/api/v1/health-all', async (req, res) => {
  const status = {};
  for (const [key, svc] of Object.entries(SERVICES)) {
    try {
      const r = await fetch(`${svc.url}/health`);
      status[key] = r.ok ? 'HEALTHY' : 'UNHEALTHY';
    } catch (e) {
      status[key] = 'DOWN';
    }
  }
  res.status(200).json({ gateway: 'ONLINE', services: status });
});

// Điều phối chung cho tất cả service và chuyển tiếp JWT Authorization
app.use('/api/v1/:service', async (req, res) => {
  const serviceKey = req.params.service;
  const target = SERVICES[serviceKey];

  if (!target) {
    return res.status(404).json({ error: `Unknown service: ${serviceKey}` });
  }

  const subPath = req.url || '/';
  const targetUrl = `${target.url}${subPath}`;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const options = { method: req.method, headers };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    res.status(response.status).send(payload);
  } catch (error) {
    res.status(502).json({
      error: `Gateway failed to reach ${target.name}`,
      details: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Gateway is running on port ${PORT}`);
});
