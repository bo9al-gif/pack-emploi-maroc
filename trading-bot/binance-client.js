const crypto = require('node:crypto');

const BASE_URL = process.env.BINANCE_BASE_URL || 'https://testnet.binance.vision';

function buildQueryString(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

function signQuery(queryString, secret) {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

async function signedRequest(method, path, params, { apiKey, secret }) {
  const query = buildQueryString({
    ...params,
    timestamp: Date.now(),
    recvWindow: 5000
  });
  const signature = signQuery(query, secret);
  const url = `${BASE_URL}${path}?${query}&signature=${signature}`;

  const response = await fetch(url, {
    method,
    headers: { 'X-MBX-APIKEY': apiKey }
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!response.ok) {
    const error = new Error(data.msg || `Binance HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function placeSpotMarketBuy({ apiKey, secret, symbol = 'BTCUSDT', quoteOrderQty = '10' }) {
  if (!apiKey || !secret) throw new Error('BINANCE_API_KEY and BINANCE_API_SECRET are required');
  return signedRequest('POST', '/api/v3/order', {
    symbol,
    side: 'BUY',
    type: 'MARKET',
    quoteOrderQty
  }, { apiKey, secret });
}

module.exports = { BASE_URL, buildQueryString, signQuery, signedRequest, placeSpotMarketBuy };
