const express = require('express');
const app = express();

const PORT = process.env.PORT || 3001;
const DB_INFO = {
  engine: 'MongoDB (product_db:27017)',
  volume: 'product_data (/data/db)',
  uri: process.env.DB_URI || 'mongodb://product-db:27017/product_db',
  status: 'CONNECTED'
};

app.use(express.json());

const PRODUCTS = [
  {
    id: 'prod-1',
    sku: 'SRV-K3S-01',
    name: 'Mini PC Homelab Cluster Node i7-13700H (64GB RAM)',
    category: 'server',
    categoryLabel: 'Mini Server & Homelab',
    price: 14900000,
    rating: 4.9,
    stock: 8,
    featured: true,
    desc: 'Máy chủ mini tối ưu cho cụm Kubernetes K3s, Docker Swarm và Proxmox với 14 nhân 20 luồng.',
    specs: ['CPU: Intel Core i7-13700H', 'RAM: 64GB DDR5', 'LAN: Dual 2.5GbE + Wi-Fi 6E']
  },
  {
    id: 'prod-2',
    sku: 'NET-SW10G-02',
    name: 'Switch Quản Lý Layer 3 10GbE 8 Cổng SFP+',
    category: 'server',
    categoryLabel: 'Mini Server & Homelab',
    price: 5490000,
    rating: 4.8,
    stock: 14,
    featured: true,
    desc: 'Chuyển mạch tốc độ cao chuyên dụng cho cụm Microservices, lưu trữ Ceph/NFS và mạng VLAN nội bộ.',
    specs: ['Ports: 8x 10G SFP+', 'Switching: 160 Gbps', 'Support: VLAN, LACP, SNMP']
  },
  {
    id: 'prod-3',
    sku: 'PER-KB75-03',
    name: 'Bàn Phím Cơ DevOps CNC Nhôm 75% Hot-Swap (QMK/VIA)',
    category: 'peripherals',
    categoryLabel: 'Bàn phím & Màn hình',
    price: 3290000,
    rating: 4.9,
    stock: 19,
    featured: true,
    desc: 'Khung nhôm CNC nguyên khối, lập trình phím macro terminal qua QMK/VIA, kết nối 3 chế độ.',
    specs: ['Layout: 75% Aluminum', 'Firmware: QMK / VIA', 'Battery: 4000mAh USB-C']
  },
  {
    id: 'prod-4',
    sku: 'PER-MON4K-04',
    name: 'Màn Hình Lập Trình 27" 4K IPS USB-C 90W PD',
    category: 'peripherals',
    categoryLabel: 'Bàn phím & Màn hình',
    price: 9850000,
    rating: 4.7,
    stock: 6,
    featured: false,
    desc: 'Hiển thị sắc nét code, Grafana dashboard và terminal đa cửa sổ với cổng USB-C cấp nguồn trực tiếp.',
    specs: ['Panel: 27" IPS 3840x2160', 'USB-C: 90W Power Delivery', 'Stand: Xoay dọc 90 độ']
  },
  {
    id: 'prod-5',
    sku: 'AUD-ANC-05',
    name: 'Tai Nghe Chống Ồn Chủ Động Studio ANC Pro',
    category: 'audio',
    categoryLabel: 'Âm thanh & Hội nghị',
    price: 4650000,
    rating: 4.8,
    stock: 22,
    featured: false,
    desc: 'Khử ồn 45dB giúp tập trung debug và họp Daily Standup rõ nét với 6 micro lọc tạp âm.',
    specs: ['ANC: -45dB Hybrid', 'Battery: 45 Hours', 'Codec: LDAC / USB-C DAC']
  },
  {
    id: 'prod-6',
    sku: 'AUD-MIC-06',
    name: 'Micro Thu Âm USB-C / XLR Dynamic Cho Họp & Podcast',
    category: 'audio',
    categoryLabel: 'Âm thanh & Hội nghị',
    price: 2490000,
    rating: 4.6,
    stock: 9,
    featured: false,
    desc: 'Định hướng Cardioid loại bỏ tiếng gõ bàn phím cơ khi demo đồ án hoặc họp trực tuyến.',
    specs: ['Pattern: Cardioid Dynamic', 'Output: USB-C & XLR', 'Monitor: 3.5mm Zero-Latency']
  },
  {
    id: 'prod-7',
    sku: 'SEC-NVME-07',
    name: 'Ổ Cứng SSD NVMe PCIe Gen 5 4TB Enterprise',
    category: 'security',
    categoryLabel: 'Lưu trữ & Bảo mật',
    price: 8900000,
    rating: 4.9,
    stock: 5,
    featured: true,
    desc: 'Tốc độ đọc ghi cực cao cho Docker image layers, PostgreSQL WAL và MongoDB replica sets.',
    specs: ['Capacity: 4TB M.2 2280', 'Read: 14,000 MB/s', 'Endurance: 3000 TBW']
  },
  {
    id: 'prod-8',
    sku: 'SEC-KEY-08',
    name: 'Khóa Bảo Mật Phần Cứng FIDO2 / SSH Hardware Token',
    category: 'security',
    categoryLabel: 'Lưu trữ & Bảo mật',
    price: 1650000,
    rating: 5.0,
    stock: 30,
    featured: false,
    desc: 'Xác thực 2 lớp phần cứng cho GitHub, SSH production server, AWS IAM và ký GPG commit.',
    specs: ['Protocol: FIDO2 / U2F / PIV', 'Interface: USB-C + NFC', 'Rating: IP68 Chống nước']
  }
];

app.get('/', (req, res) => {
  res.json({ service: 'product-service', status: 'running', port: PORT, database: DB_INFO, totalProducts: PRODUCTS.length });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/db', (req, res) => {
  res.json({ service: 'product-service', database: DB_INFO, records: PRODUCTS });
});

app.get('/products', (req, res) => {
  res.json({ service: 'product-service', database: DB_INFO, data: PRODUCTS });
});

app.get('/products/:id', (req, res) => {
  const product = PRODUCTS.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ service: 'product-service', database: DB_INFO, data: product });
});

app.get('/search', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  const category = (req.query.category || 'all').trim().toLowerCase();
  const stock = (req.query.stock || 'all').trim().toLowerCase();

  const filtered = PRODUCTS.filter((p) => {
    if (category !== 'all' && p.category !== category) return false;
    if (stock === 'instock' && p.stock <= 0) return false;
    if (stock === 'lowstock' && p.stock > 10) return false;
    if (q && !(p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.categoryLabel.toLowerCase().includes(q))) {
      return false;
    }
    return true;
  });

  res.json({ service: 'product-service', database: DB_INFO, query: req.query, data: filtered });
});

// Giữ và trừ tồn kho thật khi Saga Checkout chạy
app.post('/reserve', (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  for (const reqItem of items) {
    const product = PRODUCTS.find((p) => p.id === reqItem.productId);
    const qty = Number(reqItem.quantity) || 1;
    if (!product) {
      return res.status(404).json({ error: `Product not found: ${reqItem.productId}` });
    }
    if (product.stock < qty) {
      return res.status(409).json({ error: `Không đủ tồn kho cho ${product.sku} (còn ${product.stock})` });
    }
  }

  for (const reqItem of items) {
    const product = PRODUCTS.find((p) => p.id === reqItem.productId);
    product.stock -= Number(reqItem.quantity) || 1;
  }

  res.status(200).json({
    service: 'product-service',
    database: DB_INFO,
    status: 'INVENTORY_RESERVED',
    reservedItems: items,
    timestamp: new Date().toISOString()
  });
});

// Hoàn tồn kho (Saga Compensation) nếu bước thanh toán thất bại
app.post('/release', (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  for (const reqItem of items) {
    const product = PRODUCTS.find((p) => p.id === reqItem.productId);
    if (product) product.stock += Number(reqItem.quantity) || 1;
  }
  res.status(200).json({
    service: 'product-service',
    database: DB_INFO,
    status: 'INVENTORY_RELEASED',
    releasedItems: items,
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(200).json({
    service: 'product-service',
    database: DB_INFO,
    handledPath: req.originalUrl,
    method: req.method,
    status: 'OK'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Product Service is running on port ${PORT}`);
});