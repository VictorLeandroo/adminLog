const KEEP_ALIVE_INTERVAL_MS = 29 * 60 * 1000;

function startDatabaseKeepAlive(prisma, logger = console) {
  let running = false;

  async function ping() {
    if (running) return;
    running = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      logger.error('[database-keep-alive] Falha ao consultar o banco:', error.message);
    } finally {
      running = false;
    }
  }

  void ping();
  const timer = setInterval(ping, KEEP_ALIVE_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = { startDatabaseKeepAlive, KEEP_ALIVE_INTERVAL_MS };
