const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Cart Service is running', port: PORT });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Cart Service is running on port ${PORT}`);
});