const express = require('express');
const redis = require('redis');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_devops_key_123';
const DB_INFO = {
  engine: 'Redis 7 Alpine (cart_db:6379)',
  uri: process.env.DB_URI || 'redis://cart-db:6379'
};

const redisClient = redis.createClient({ url: DB_INFO.uri });
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect().then(() => console.log('Connected to Redis')).catch(console.error);

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
};

function normalizeItems(rawItems) {
  const merged = new Map();
  for (const it of rawItems || []) {
    if (!it || !it.productId) continue;
    const qty = Number(it.quantity) || 1;
    merged.set(it.productId, (merged.get(it.productId) || 0) + qty);
  }
  return Array.from(merged.entries())
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
}

app.get('/', (req, res) => {
  res.json({ service: 'cart-service', status: 'running', port: PORT, database: DB_INFO });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Lấy giỏ hàng theo userId
app.get('/items', authenticate, async (req, res) => {
  try {
    const cartKey = `cart:${req.user.userId}`;
    const data = await redisClient.get(cartKey);
    const items = normalizeItems(data ? JSON.parse(data) : []);
    res.json({ service: 'cart-service', database: DB_INFO, userId: req.user.userId, items });
  } catch (error) {
    res.status(500).json({ error: 'Redis fetch failed', details: error.message });
  }
});

// Thêm vào giỏ hàng theo userId (tự cộng dồn nếu trùng productId)
app.post('/items', authenticate, async (req, res) => {
  try {
    const cartKey = `cart:${req.user.userId}`;
    const productId = req.body?.productId;
    const quantity = Number(req.body?.quantity) || 1;
    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    const data = await redisClient.get(cartKey);
    const items = normalizeItems(data ? JSON.parse(data) : []);
    const existing = items.find((i) => i.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else if (quantity > 0) {
      items.push({ productId, quantity });
    }

    const cleaned = items.filter((i) => i.quantity > 0);
    await redisClient.set(cartKey, JSON.stringify(cleaned));

    res.status(201).json({
      service: 'cart-service',
      database: DB_INFO,
      userId: req.user.userId,
      message: 'Added to Redis cart',
      items: cleaned
    });
  } catch (error) {
    res.status(500).json({ error: 'Redis save failed', details: error.message });
  }
});

// Cập nhật số lượng 1 sản phẩm trong giỏ
app.patch('/items/:productId', authenticate, async (req, res) => {
  try {
    const cartKey = `cart:${req.user.userId}`;
    const { productId } = req.params;
    const quantity = Number(req.body?.quantity);
    if (Number.isNaN(quantity)) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    const data = await redisClient.get(cartKey);
    let items = normalizeItems(data ? JSON.parse(data) : []);

    if (quantity <= 0) {
      items = items.filter((i) => i.productId !== productId);
    } else {
      const existing = items.find((i) => i.productId === productId);
      if (existing) existing.quantity = quantity;
      else items.push({ productId, quantity });
    }

    await redisClient.set(cartKey, JSON.stringify(items));
    res.status(200).json({ service: 'cart-service', database: DB_INFO, userId: req.user.userId, items });
  } catch (error) {
    res.status(500).json({ error: 'Redis update failed', details: error.message });
  }
});

// Xóa 1 sản phẩm khỏi giỏ
app.delete('/items/:productId', authenticate, async (req, res) => {
  try {
    const cartKey = `cart:${req.user.userId}`;
    const { productId } = req.params;

    const data = await redisClient.get(cartKey);
    const items = normalizeItems(data ? JSON.parse(data) : []).filter((i) => i.productId !== productId);

    await redisClient.set(cartKey, JSON.stringify(items));
    res.status(200).json({ service: 'cart-service', database: DB_INFO, userId: req.user.userId, items });
  } catch (error) {
    res.status(500).json({ error: 'Redis delete failed', details: error.message });
  }
});

// Xóa toàn bộ giỏ hàng của user (dùng sau khi đặt hàng thành công)
app.delete('/items', authenticate, async (req, res) => {
  try {
    const cartKey = `cart:${req.user.userId}`;
    await redisClient.del(cartKey);
    res.status(200).json({ service: 'cart-service', database: DB_INFO, userId: req.user.userId, items: [] });
  } catch (error) {
    res.status(500).json({ error: 'Redis clear failed', details: error.message });
  }
});

// Kiểm tra mã giảm giá
app.post('/coupon', (req, res) => {
  const code = (req.body?.code || '').trim().toUpperCase();
  const COUPONS = { DEVOPS20: 0.2, K3S10: 0.1 };
  const discountRate = COUPONS[code] || 0;
  res.status(200).json({
    service: 'cart-service',
    database: DB_INFO,
    coupon: code,
    discountValid: discountRate > 0,
    discountRate
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Cart Service is running on port ${PORT}`);
});