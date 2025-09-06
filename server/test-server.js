const express = require('express');
const cors = require('cors');
const app = express();
const port = 4001;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const ledgerRoutes = require('./ledger-routes');

// Use routes
app.use(ledgerRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Ledger API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Ledger API server running on http://localhost:${port}`);
  console.log(`API Documentation:
  - GET    /api/ledger/entries     - List all ledger entries
  - POST   /api/ledger/entries     - Create a new ledger entry
  - GET    /api/ledger/balance     - Get current balance
  - GET    /api/ledger/profit-and-loss - Get profit and loss statement
  - GET    /api/ledger/categories  - Get all categories`);
});
