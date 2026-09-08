const assert = require('node:assert/strict');
const test = require('node:test');
const createDatabaseHealth = require('./database-health.cjs');

const response = () => ({
  code: 200, body: null,
  set() { return this; },
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
});

test('coalesces concurrent checks and caches success', async () => {
  let calls = 0;
  const handler = createDatabaseHealth(async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); });
  const a = response(), b = response();
  await Promise.all([handler({}, a), handler({}, b)]);
  await handler({}, response());
  assert.equal(calls, 1);
  assert.equal(a.code, 200);
  assert.equal(b.body.database, 'available');
});
test('returns 503 without exposing database errors', async () => {
  const handler = createDatabaseHealth(async () => { throw new Error('private database password'); });
  const res = response();
  await handler({}, res);
  assert.equal(res.code, 503);
  assert.deepEqual(res.body, { ok: false, database: 'unavailable' });
});
