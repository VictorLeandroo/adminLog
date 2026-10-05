require('dotenv').config();

const app = require('./app');
const prisma = require('./lib/prisma');
const { startDatabaseKeepAlive } = require('./lib/databaseKeepAlive');

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}/api`);
  if (process.env.DATABASE_KEEP_ALIVE_ENABLED !== 'false') {
    startDatabaseKeepAlive(prisma);
  }
});
