const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startDatabaseKeepAlive } = require('../src/lib/databaseKeepAlive');

test('consulta ao iniciar e a cada 29 minutos, com cancelamento', async (t) => {
  let callback;
  let calls = 0;
  const timer = { unref() {} };
  t.mock.method(global, 'setInterval', (fn, interval) => {
    assert.equal(interval, 29 * 60 * 1000);
    callback = fn;
    return timer;
  });
  const clear = t.mock.method(global, 'clearInterval', (value) => assert.equal(value, timer));
  const stop = startDatabaseKeepAlive({ $queryRaw: async (sql) => {
    assert.equal(sql[0], 'SELECT 1');
    calls++;
  } });
  await Promise.resolve();
  assert.equal(calls, 1);
  await callback();
  assert.equal(calls, 2);
  stop();
  assert.equal(clear.mock.callCount(), 1);
});

test('evita consultas sobrepostas e volta a consultar após falha', async (t) => {
  let callback;
  let rejectQuery;
  let calls = 0;
  const errors = [];
  t.mock.method(global, 'setInterval', (fn) => { callback = fn; return { unref() {} }; });
  t.mock.method(global, 'clearInterval', () => {});
  const stop = startDatabaseKeepAlive({ $queryRaw: () => {
    calls++;
    return calls === 1 ? new Promise((_resolve, reject) => { rejectQuery = reject; }) : Promise.resolve();
  } }, { error: (...args) => errors.push(args) });
  await callback();
  assert.equal(calls, 1);
  rejectQuery(new Error('Banco indisponível'));
  await Promise.resolve();
  assert.equal(errors.length, 1);
  assert.equal(errors[0][1], 'Banco indisponível');
  await callback();
  assert.equal(calls, 2);
  stop();
});
