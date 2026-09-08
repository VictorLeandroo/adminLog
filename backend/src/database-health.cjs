/** Readiness check: no business data returned, coalesced and cached to limit load. */
module.exports = function createDatabaseHealth(checkDatabase) {
  let pending;
  let cached;
  let expires = 0;
  return async function databaseHealth(_req, res) {
    res.set('Cache-Control', 'no-store');
    if (!cached || Date.now() >= expires) {
      if (!pending) {
        pending = Promise.resolve().then(checkDatabase).then(
          () => ({ ok: true, database: 'available' }),
          () => ({ ok: false, database: 'unavailable' }),
        ).then(result => {
          cached = result;
          expires = Date.now() + (result.ok ? 5 * 60_000 : 60_000);
          return result;
        }).finally(() => { pending = undefined; });
      }
      let timeout;
      const result = await Promise.race([
        pending,
        new Promise(resolve => { timeout = setTimeout(() => resolve({ ok: false, database: 'timeout' }), 8000); }),
      ]);
      clearTimeout(timeout);
      return res.status(result.ok ? 200 : 503).json(result);
    }
    return res.status(cached.ok ? 200 : 503).json(cached);
  };
};
