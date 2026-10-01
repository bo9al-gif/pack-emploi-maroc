const test = require('node:test');
const assert = require('node:assert/strict');
const { buildQueryString, signQuery } = require('../binance-client');

test('buildQueryString preserves parameter order', () => {
  assert.equal(
    buildQueryString({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: '0.001' }),
    'symbol=BTCUSDT&side=BUY&type=MARKET&quantity=0.001'
  );
});

test('signQuery returns a deterministic HMAC SHA-256 signature', () => {
  const signature = signQuery('symbol=BTCUSDT&side=BUY', 'test-secret');
  assert.equal(
    signature,
    '8dc57f0ead8c0dfaf1104c57934ec49e1ba5d5293f8a6e3a492c2a9842a5287e'
  );
});
