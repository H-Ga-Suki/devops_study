const express = require('express');
const app = express();

const PORT = process.env.PORT || 3004; 

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Payment Service is running', port: PORT });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Payment Service is running on port ${PORT}`);
});