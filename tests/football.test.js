const test = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../api/football");

function makeReq(query = {}, method = "GET", ip = "sportmonks-test") {
  return {
    method,
    query,
    headers: { "x-forwarded-for": ip },
    socket: { remoteAddress: ip }
  };
}

function makeRes() {
  return {
    code: 200,
    headers: {},
    body: null,
    status(code) { this.code = code; return this; },
    setHeader(name, value) { this.headers[name] = value; return this; },
    json(value) { this.body = value; return this; }
  };
}

test("rejects non-GET methods without calling Sportmonks", async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error("unexpected fetch"); };
  try {
    const res = makeRes();
    await handler(makeReq({ action: "live" }, "POST", "sm-method-test"), res);
    assert.equal(res.code, 405);
    assert.equal(calls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("validates calendar dates and date-range bounds before any external call", async () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.SPORTMONKS_API_TOKEN;
  process.env.SPORTMONKS_API_TOKEN = "test-token";
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error("unexpected fetch"); };
  try {
    const invalid = makeRes();
    await handler(makeReq({ action: "fixtures", date: "2026-02-30" }, "GET", "sm-date-test"), invalid);
    assert.equal(invalid.code, 400);

    const tooLong = makeRes();
    await handler(makeReq({ action: "fixtures", from: "2026-10-01", to: "2026-10-31" }, "GET", "sm-range-test"), tooLong);
    assert.equal(tooLong.code, 400);
    assert.equal(calls, 0);
  } finally {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.SPORTMONKS_API_TOKEN;
    else process.env.SPORTMONKS_API_TOKEN = originalToken;
  }
});

test("returns an actionable configuration error when the server token is missing", async () => {
  const originalToken = process.env.SPORTMONKS_API_TOKEN;
  const originalFallback = process.env.SPORTMONKS_TOKEN;
  const originalFetch = global.fetch;
  delete process.env.SPORTMONKS_API_TOKEN;
  delete process.env.SPORTMONKS_TOKEN;
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error("unexpected fetch"); };
  try {
    const res = makeRes();
    await handler(makeReq({ action: "live" }, "GET", "sm-missing-token-test"), res);
    assert.equal(res.code, 503);
    assert.equal(res.body.code, "SPORTMONKS_TOKEN_MISSING");
    assert.equal(calls, 0);
  } finally {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.SPORTMONKS_API_TOKEN;
    else process.env.SPORTMONKS_API_TOKEN = originalToken;
    if (originalFallback === undefined) delete process.env.SPORTMONKS_TOKEN;
    else process.env.SPORTMONKS_TOKEN = originalFallback;
  }
});

test("requests fixtures from the authenticated Sportmonks API without putting the token in the URL", async () => {
  const originalToken = process.env.SPORTMONKS_API_TOKEN;
  const originalFetch = global.fetch;
  process.env.SPORTMONKS_API_TOKEN = "safe-test-token";
  let capturedUrl;
  let capturedOptions;
  global.fetch = async (url, options) => {
    capturedUrl = String(url);
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      async text() { return JSON.stringify({ data: [{ id: 123, name: "Home vs Away" }] }); }
    };
  };

  try {
    const res = makeRes();
    await handler(makeReq({ action: "fixtures", date: "2026-10-18" }, "GET", "sm-success-test"), res);
    assert.equal(res.code, 200);
    assert.equal(res.body.source, "Sportmonks");
    assert.equal(res.body.data[0].id, 123);
    assert.equal(new URL(capturedUrl).pathname, "/v3/football/fixtures/date/2026-10-18");
    assert.equal(new URL(capturedUrl).searchParams.get("api_token"), null);
    assert.equal(capturedOptions.headers.Authorization, "safe-test-token");
    assert.equal(new URL(capturedUrl).searchParams.get("include").includes("participants"), true);
  } finally {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.SPORTMONKS_API_TOKEN;
    else process.env.SPORTMONKS_API_TOKEN = originalToken;
  }
});

test("does not expose upstream authentication or subscription error details", async () => {
  const originalToken = process.env.SPORTMONKS_API_TOKEN;
  const originalFetch = global.fetch;
  process.env.SPORTMONKS_API_TOKEN = "safe-test-token";
  global.fetch = async () => ({
    ok: false,
    status: 403,
    async text() { return JSON.stringify({ message: "private account detail" }); }
  });

  try {
    const res = makeRes();
    await handler(makeReq({ action: "fixture", id: "12345" }, "GET", "sm-403-test"), res);
    assert.equal(res.code, 502);
    assert.equal(res.body.code, "SPORTMONKS_PLAN_ACCESS");
    assert.equal(JSON.stringify(res.body).includes("private account detail"), false);
    assert.equal(JSON.stringify(res.body).includes("safe-test-token"), false);
  } finally {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.SPORTMONKS_API_TOKEN;
    else process.env.SPORTMONKS_API_TOKEN = originalToken;
  }
});
