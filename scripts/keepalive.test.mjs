import test from 'node:test';
import assert from 'node:assert/strict';
import { targetsFrom, inWindow, checkTarget } from './keepalive.mjs';
test('validates both HTTPS origins', () => {
  assert.equal(targetsFrom({ ADMINLOG_URL: 'https://a.example', WEHOME_URL: 'https://b.example/' })[1].url, 'https://b.example/health/database');
  assert.throws(() => targetsFrom({ ADMINLOG_URL: 'https://a.example', WEHOME_URL: 'http://b.example' }));
  assert.throws(() => targetsFrom({ ADMINLOG_URL: 'https://a.example' }));
});
test('respects Sao Paulo window, including 24h', () => {
  assert.equal(inWindow({}, new Date('2026-09-08T10:00:00Z')), false);
  assert.equal(inWindow({}, new Date('2026-09-08T11:00:00Z')), true);
  assert.equal(inWindow({}, new Date('2026-09-08T22:00:00Z')), false);
  assert.equal(inWindow({ START_HOUR: '0', END_HOUR: '24' }, new Date('2026-09-08T03:00:00Z')), true);
});
test('retries once and requires database readiness', async () => {
  let calls = 0;
  const result = await checkTarget({ name: 'test', url: 'https://test.example' }, async () => {
    calls++;
    return Response.json(calls === 1 ? { ok: true } : { ok: true, database: 'available' });
  }, async () => {});
  assert.equal(result, true);
  assert.equal(calls, 2);
  assert.equal(await checkTarget({ name: 'test', url: 'https://test.example' }, async () => Response.json({ ok: false }, { status: 503 }), async () => {}), false);
});
