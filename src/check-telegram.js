require('dotenv').config();
const { Telegraf } = require('telegraf');
const { checkTelegram } = require('./telegram-check');

async function main() {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error('BOT_TOKEN is missing from .env.');

  console.log('Checking Telegram connection and bot token (15-second timeout)...');
  const bot = new Telegraf(token);
  const me = await checkTelegram(bot.telegram);
  console.log(`Connected successfully to @${me.username} (bot ID ${me.id}).`);
}

main().catch((err) => {
  console.error(`Telegram check failed: ${err.message}`);
  process.exitCode = 1;
});
