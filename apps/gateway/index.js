const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000; 

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API Gateway is running', port: PORT });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Gateway is running on port ${PORT}`);
});