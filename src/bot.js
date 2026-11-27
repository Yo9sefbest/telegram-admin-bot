const { Telegraf, Markup } = require('telegraf');
const { t } = require('./messages');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createBot({ token, db, adminIds }) {
  const bot = new Telegraf(token);

  const isAdmin = (ctx) => adminIds.includes(ctx.from?.id);
  const argsOf = (ctx) => ctx.message.text.replace(/^\/\w+(@\w+)?\s*/, '').trim();

  const formatStats = (s) =>
    `📊 Stats\nUsers: ${s.users}\nActive (24h): ${s.active24h}\nBanned: ${s.banned}\nFeedback: ${s.feedback}`;

  // Sends a message to every non-banned user, slowly enough to respect Telegram's rate limits.
  async function broadcast(text) {
    let sent = 0;
    let failed = 0;
    for (const id of db.activeUserIds()) {
      try {
        await bot.telegram.sendMessage(id, text);
        sent += 1;
      } catch {
        failed += 1; // user blocked the bot or deleted the account
      }
      await sleep(50); // ~20 messages/second
    }
    return { sent, failed };
  }

  // 1) Remember every user and block banned ones before any handler runs.
  bot.use(async (ctx, next) => {
    if (!ctx.from) return next();
    db.upsertUser({
      id: ctx.from.id,
      username: ctx.from.username ?? null,
      first_name: ctx.from.first_name ?? null,
    });
    if (db.isBanned(ctx.from.id) && !isAdmin(ctx)) {
      if (ctx.callbackQuery) return ctx.answerCbQuery();
      return ctx.reply(t('banned'));
    }
    return next();
  });

  // 2) Public commands
  bot.start((ctx) => ctx.reply(t('welcome', ctx.from.first_name)));
  bot.help((ctx) => ctx.reply(t('help')));

  bot.command('feedback', async (ctx) => {
    const text = argsOf(ctx);
    if (!text) return ctx.reply(t('feedbackUsage'));
    if (text.length > 1000) return ctx.reply(t('feedbackTooLong'));

    db.addFeedback(ctx.from.id, text);
    const who = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    for (const adminId of adminIds) {
      bot.telegram.sendMessage(adminId, `💬 Feedback from ${who} (${ctx.from.id}):\n${text}`).catch(() => {});
    }
    return ctx.reply(t('feedbackThanks'));
  });

  // 3) Admin commands
  const adminOnly = (handler) => (ctx) =>
    isAdmin(ctx) ? handler(ctx) : ctx.reply(t('notAdmin'));

  bot.command('admin', adminOnly((ctx) =>
    ctx.reply(
      'Admin panel',
      Markup.inlineKeyboard([
        [Markup.button.callback('📊 Stats', 'admin:stats'), Markup.button.callback('💬 Feedback', 'admin:feedback')],
      ]),
    )));

  bot.command('stats', adminOnly((ctx) => ctx.reply(formatStats(db.stats()))));

  bot.action('admin:stats', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx)) return undefined;
    return ctx.reply(formatStats(db.stats()));
  });

  bot.action('admin:feedback', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx)) return undefined;
    const items = db.listFeedback(5);
    if (items.length === 0) return ctx.reply('No feedback yet.');
    // Keep each entry below Telegram's 4096-character message limit.
    for (const item of items) {
      const header = `#${item.id} ${item.first_name ?? item.user_id}:\n`;
      await ctx.reply(`${header}${item.text.slice(0, 4000 - header.length)}`);
    }
    return undefined;
  });

  bot.command('broadcast', adminOnly(async (ctx) => {
    const text = argsOf(ctx);
    if (!text) return ctx.reply('Usage: /broadcast <message>');
    await ctx.reply('Sending…');
    const { sent, failed } = await broadcast(text);
    return ctx.reply(`Done. Delivered: ${sent}, failed: ${failed}`);
  }));

  const setBan = (banned) => adminOnly((ctx) => {
    const id = Number(argsOf(ctx));
    if (!Number.isSafeInteger(id) || id <= 0) return ctx.reply(`Usage: /${banned ? 'ban' : 'unban'} <user_id>`);
    if (adminIds.includes(id)) return ctx.reply('You cannot ban an admin.');
    return ctx.reply(db.setBanned(id, banned) ? `User ${id} ${banned ? 'banned' : 'unbanned'}.` : 'User not found.');
  });
  bot.command('ban', setBan(true));
  bot.command('unban', setBan(false));

  bot.catch((err, ctx) => {
    console.error(`Error while handling update ${ctx.update.update_id}:`, err);
  });

  return { bot, broadcast };
}

module.exports = { createBot };
