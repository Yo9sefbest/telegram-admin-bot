require('dotenv').config();
const { createDb } = require('./db');
const { createBot } = require('./bot');
const { createServer } = require('./server');

const {
  BOT_TOKEN,
  ADMIN_IDS = '',
  ADMIN_USER = 'admin',
  ADMIN_PASSWORD,
  HOST = '127.0.0.1',
  PORT = '3000',
} = process.env;

function fail(message) {
  console.error(`Config error: ${message}`);
  process.exit(1);
}

if (!BOT_TOKEN) fail('BOT_TOKEN is missing (create one with @BotFather).');
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) fail('ADMIN_PASSWORD must be at least 8 characters.');

const adminIds = ADMIN_IDS.split(',').map((id) => Number(id.trim())).filter(Number.isInteger);
if (adminIds.length === 0) console.warn('Warning: ADMIN_IDS is empty, so no one can use the admin commands.');

async function main() {
  const db = createDb();
  const { bot, broadcast } = createBot({ token: BOT_TOKEN, db, adminIds });

  const me = await bot.telegram.getMe(); // also validates the token early
  const app = createServer({ db, broadcast, adminUser: ADMIN_USER, adminPassword: ADMIN_PASSWORD });
  const server = app.listen(Number(PORT), HOST, () => {
    console.log(`Dashboard: http://${HOST}:${PORT}  (user: ${ADMIN_USER})`);
  });

  bot.launch().catch((err) => {
    console.error('Bot stopped with an error:', err);
    process.exit(1);
  });
  console.log(`Bot @${me.username} is running`);

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down…`);
    bot.stop(signal);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
