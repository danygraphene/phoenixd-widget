const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Config
const PHOENIXD_HOST = process.env.PHOENIXD_HOST || 'http://localhost:9740';
const PHOENIXD_PASSWORD = process.env.PHOENIXD_PASSWORD;
const PORT = process.env.PORT || 3456;

if (!PHOENIXD_PASSWORD) {
  console.error('PHOENIXD_PASSWORD required. Set in .env file.');
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(':' + PHOENIXD_PASSWORD).toString('base64');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API: Get current balance
app.get('/api/balance', async (req, res) => {
  try {
    const response = await fetch(`${PHOENIXD_HOST}/getbalance`, {
      headers: { 'Authorization': authHeader }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get node info
app.get('/api/info', async (req, res) => {
  try {
    const response = await fetch(`${PHOENIXD_HOST}/getinfo`, {
      headers: { 'Authorization': authHeader }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get recent payments
app.get('/api/payments', async (req, res) => {
  try {
    const response = await fetch(`${PHOENIXD_HOST}/payments/incoming?all=true`, {
      headers: { 'Authorization': authHeader }
    });
    const data = await response.json();
    // Return only last 10 paid payments
    const paid = data.filter(p => p.isPaid).slice(0, 10);
    res.json(paid);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Connected browser clients
const clients = new Set();

// Connect to phoenixd websocket
let phoenixWs = null;
let reconnectTimeout = null;

function connectToPhoenixd() {
  const wsUrl = PHOENIXD_HOST.replace('http', 'ws') + '/websocket';
  
  console.log(`Connecting to phoenixd websocket: ${wsUrl}`);
  
  phoenixWs = new WebSocket(wsUrl, {
    headers: { 'Authorization': authHeader }
  });

  phoenixWs.on('open', () => {
    console.log('Connected to phoenixd websocket');
  });

  phoenixWs.on('message', async (data) => {
    const event = JSON.parse(data.toString());
    console.log('Phoenixd event:', event);

    // Broadcast to all connected browser clients
    const message = JSON.stringify(event);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    // If payment received, also fetch updated balance
    if (event.type === 'payment_received') {
      try {
        const response = await fetch(`${PHOENIXD_HOST}/getbalance`, {
          headers: { 'Authorization': authHeader }
        });
        const balance = await response.json();
        const balanceMsg = JSON.stringify({ type: 'balance_update', ...balance });
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(balanceMsg);
          }
        });
      } catch (err) {
        console.error('Failed to fetch balance:', err);
      }
    }
  });

  phoenixWs.on('error', (err) => {
    console.error('Phoenixd websocket error:', err.message);
  });

  phoenixWs.on('close', () => {
    console.log('Phoenixd websocket closed, reconnecting in 5s...');
    reconnectTimeout = setTimeout(connectToPhoenixd, 5000);
  });
}

// Handle browser websocket connections
wss.on('connection', async (ws) => {
  console.log('Browser client connected');
  clients.add(ws);

  // Send current balance immediately
  try {
    const response = await fetch(`${PHOENIXD_HOST}/getbalance`, {
      headers: { 'Authorization': authHeader }
    });
    const balance = await response.json();
    ws.send(JSON.stringify({ type: 'balance_update', ...balance }));
  } catch (err) {
    console.error('Failed to fetch initial balance:', err);
  }

  ws.on('close', () => {
    console.log('Browser client disconnected');
    clients.delete(ws);
  });
});

// Start
connectToPhoenixd();

server.listen(PORT, () => {
  console.log(`Phoenixd Widget server running on http://localhost:${PORT}`);
});
