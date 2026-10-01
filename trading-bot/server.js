const http = require('node:http');
const { placeSpotMarketBuy } = require('./binance-client');

const PORT = Number(process.env.PORT || 10000);
const TEST_ORDER_ENABLED = process.env.TEST_ORDER_ENABLED === 'true';

const server = http.createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');

  if (req.url === '/health') {
    res.end(JSON.stringify({ ok: true, mode: 'BINANCE_SPOT_TESTNET' }));
    return;
  }

  if (req.url === '/test-buy' && req.method === 'POST') {
    if (!TEST_ORDER_ENABLED) {
      res.statusCode = 403;
      res.end(JSON.stringify({ ok: false, error: 'TEST_ORDER_ENABLED is false' }));
      return;
    }

    try {
      const result = await placeSpotMarketBuy({
        apiKey: process.env.BINANCE_API_KEY,
        secret: process.env.BINANCE_API_SECRET,
        symbol: process.env.TEST_SYMBOL || 'BTCUSDT',
        quoteOrderQty: process.env.TEST_QUOTE_QTY || '10'
      });
      res.end(JSON.stringify({ ok: true, testnet: true, order: result }));
    } catch (error) {
      res.statusCode = error.status || 500;
      res.end(JSON.stringify({ ok: false, error: error.message, details: error.data || null }));
    }
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`AI Maroc Binance Testnet bot listening on port ${PORT}`);
});
