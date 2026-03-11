# Phoenixd Widget

Real-time Lightning payment widget for phoenixd. Shows live balance updates and payment notifications via WebSockets.

## Features

- 🔄 Real-time balance updates via WebSocket
- ⚡ Instant payment notifications
- 📱 Embeddable mini widget for blogs
- 🎨 Beautiful dark theme UI

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your phoenixd password
```

3. Run:
```bash
npm start
```

## Endpoints

- **Full Dashboard**: `http://localhost:3456/`
- **Mini Widget**: `http://localhost:3456/widget.html`
- **API - Balance**: `GET /api/balance`
- **API - Payments**: `GET /api/payments`
- **WebSocket**: `ws://localhost:3456/`

## Embedding in Your Blog

Add this iframe to your blog:

```html
<iframe 
  src="https://your-domain.com/widget.html" 
  style="border:none; width:200px; height:50px; background:transparent;"
></iframe>
```

Or use the JavaScript widget:

```html
<div id="lightning-widget"></div>
<script>
  window.PHOENIXD_WIDGET_HOST = 'https://your-domain.com';
</script>
<script src="https://your-domain.com/widget.js"></script>
```

## WebSocket Events

### balance_update
```json
{
  "type": "balance_update",
  "balanceSat": 12345,
  "feeCreditSat": 0
}
```

### payment_received
```json
{
  "type": "payment_received",
  "paymentHash": "abc123...",
  "receivedSat": 1000,
  "description": "Payment for coffee"
}
```

## License

MIT
