const test = require('node:test');
const assert = require('node:assert/strict');

const PROVIDER_KEYS = [
  'GROQ_API_KEY',
  'CEREBRAS_API_KEY',
  'GEMINI_API_KEY',
  'OPENROUTER_API_KEY',
  'HF_TOKEN'
];

function makeResponse(status, payload, raw = false) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return raw ? String(payload) : JSON.stringify(payload);
    }
  };
}

function makeReq(prompt, ip, language = 'English') {
  return {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
    body: { prompt, language }
  };
}

function makeRes() {
  return {
    code: 200,
    headers: {},
    body: null,
    status(code) { this.code = code; return this; },
    setHeader(name, value) { this.headers[name] = value; return this; },
    end(value) { this.body = value; return this; }
  };
}

function clearProviderEnv() {
  for (const key of PROVIDER_KEYS) delete process.env[key];
}

test('chat rejects an empty prompt before calling external providers', async () => {
  clearProviderEnv();
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error('fetch should not run'); };

  try {
    const handler = require('../api/chat');
    const res = makeRes();
    await handler(makeReq('   ', 'test-empty-1'), res);

    assert.equal(res.code, 400);
    assert.deepEqual(JSON.parse(res.body), { error: 'كتب الطلب ديالك الأول.' });
    assert.equal(calls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test('chat rejects prompts longer than 8000 characters', async () => {
  clearProviderEnv();
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error('fetch should not run'); };

  try {
    const handler = require('../api/chat');
    const res = makeRes();
    await handler(makeReq('x'.repeat(8001), 'test-long-1'), res);

    assert.equal(res.code, 413);
    assert.deepEqual(JSON.parse(res.body), {
      error: 'الطلب طويل بزاف. قصّرو وخليه أقل من 8000 حرف.'
    });
    assert.equal(calls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test('chat falls back from a rate-limited Groq provider to Cerebras', async () => {
  clearProviderEnv();
  process.env.GROQ_API_KEY = 'test-groq-key';
  process.env.CEREBRAS_API_KEY = 'test-cerebras-key';

  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('api.groq.com')) {
      return makeResponse(429, { error: { message: 'rate limited' } });
    }
    if (String(url).includes('api.cerebras.ai')) {
      return makeResponse(200, {
        choices: [{ message: { content: 'Cerebras answer' } }]
      });
    }
    throw new Error('unexpected external call: ' + url);
  };

  try {
    const handler = require('../api/chat');
    const res = makeRes();
    await handler(makeReq('test provider fallback', 'test-fallback-1'), res);

    assert.equal(res.code, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.answer, 'Cerebras answer');
    assert.equal(body.provider, 'cerebras');
    assert.equal(calls.length, 2);
  } finally {
    global.fetch = originalFetch;
    clearProviderEnv();
  }
});

test('chat uses the public fallback when no provider keys are configured', async () => {
  clearProviderEnv();
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('text.pollinations.ai')) {
      return makeResponse(200, 'Public fallback answer', true);
    }
    throw new Error('unexpected external call: ' + url);
  };

  try {
    const handler = require('../api/chat');
    const res = makeRes();
    await handler(makeReq('public fallback test', 'test-public-fallback-1'), res);

    assert.equal(res.code, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.answer, 'Public fallback answer');
    assert.equal(body.provider, 'public-demo');
    assert.equal(calls.length, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test('chat rate-limits the 13th request from the same client within a minute', async () => {
  clearProviderEnv();
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (!String(url).includes('text.pollinations.ai')) {
      throw new Error('unexpected external call: ' + url);
    }
    return makeResponse(200, 'ok', true);
  };

  try {
    const handler = require('../api/chat');
    const ip = 'test-rate-limit-1';
    let last;
    for (let i = 1; i <= 13; i += 1) {
      const res = makeRes();
      await handler(makeReq('rate limit test ' + i, ip), res);
      last = res;
      if (i <= 12) assert.equal(res.code, 200);
    }
    assert.equal(last.code, 429);
    assert.deepEqual(JSON.parse(last.body), {
      error: 'طلبات كثيرة دابا. عاود المحاولة من بعد دقيقة.'
    });
  } finally {
    global.fetch = originalFetch;
  }
});
