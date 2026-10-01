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
    '7c7f7c9b0a4c6d1f0d0a3d6e4b5e2c4e4c2f5f4d6e7d7a9b0e4a4a5f6a8b4b2'
  );
});
