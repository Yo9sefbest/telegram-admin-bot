const test = require('node:test');
const assert = require('node:assert/strict');
const { Telegram } = require('telegraf');
const { createDb } = require('../src/db');
const { createBot } = require('../src/bot');

const ADMIN = { id: 1, first_name: 'Admin' };
const ALI = { id: 2, first_name: 'Ali', username: 'ali' };
const SARA = { id: 3, first_name: 'Sara' };

function setup() {
  const db = createDb(':memory:');
  const { bot, broadcast } = createBot({ token: 'TEST:TOKEN', db, adminIds: [ADMIN.id] });
  bot.botInfo = { id: 99, is_bot: true, first_name: 'Test', username: 'test_bot' };

  // Telegraf builds a new Telegram client for every update, so stub the prototype
  // to capture every outgoing API call without touching the network.
  const calls = [];
  Telegram.prototype.callApi = async function callApi(method, data) {
    calls.push({ method, data });
    return { message_id: 1 };
  };

  let updateId = 0;
  const send = (from, text) => {
    updateId += 1;
    const isCommand = text.startsWith('/');
    return bot.handleUpdate({
      update_id: updateId,
      message: {
        message_id: updateId,
        date: 0,
        chat: { id: from.id, type: 'private' },
        from: { is_bot: false, ...from },
        text,
        entities: isCommand ? [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }] : undefined,
      },
    });
  };
  const sentTo = (chatId) => calls.filter((c) => c.method === 'sendMessage' && c.data.chat_id === chatId);

  return { db, bot, calls, send, sentTo, broadcast };
}

test('/start greets users in English and saves them', async () => {
  const { db, send, sentTo } = setup();
  await send(ALI, '/start');
  assert.match(sentTo(ALI.id)[0].data.text, /Hi Ali/);
  assert.equal(db.stats().users, 1);
});

test('/feedback is stored and forwarded to admins', async () => {
  const { db, send, sentTo } = setup();
  await send(SARA, '/feedback Great bot');
  assert.equal(db.listFeedback()[0].text, 'Great bot');
  assert.match(sentTo(ADMIN.id)[0].data.text, /Great bot/);
  assert.match(sentTo(SARA.id)[0].data.text, /Thanks/);
});

test('/feedback without text shows usage', async () => {
  const { db, send, sentTo } = setup();
  await send(SARA, '/feedback');
  assert.match(sentTo(SARA.id)[0].data.text, /Please add your message/);
  assert.equal(db.listFeedback().length, 0);
});

test('admin commands are blocked for normal users', async () => {
  const { send, sentTo } = setup();
  await send(SARA, '/stats');
  assert.match(sentTo(SARA.id)[0].data.text, /admins only/);
});

test('admin can ban and unban a user', async () => {
  const { db, send, sentTo } = setup();
  await send(SARA, '/start');
  await send(ADMIN, `/ban ${SARA.id}`);
  assert.equal(db.isBanned(SARA.id), true);

  await send(SARA, '/help');
  assert.match(sentTo(SARA.id).at(-1).data.text, /not allowed/);

  await send(ADMIN, `/unban ${SARA.id}`);
  assert.equal(db.isBanned(SARA.id), false);
});

test('admins cannot be banned', async () => {
  const { db, send, sentTo } = setup();
  await send(ADMIN, `/ban ${ADMIN.id}`);
  assert.match(sentTo(ADMIN.id).at(-1).data.text, /cannot ban an admin/);
  assert.equal(db.isBanned(ADMIN.id), false);
});

test('rejects invalid ban ids', async () => {
  const { send, sentTo } = setup();
  await send(ADMIN, '/ban 0');
  assert.match(sentTo(ADMIN.id).at(-1).data.text, /Usage: \/ban/);
  await send(ADMIN, '/ban');
  assert.match(sentTo(ADMIN.id).at(-1).data.text, /Usage: \/ban/);
});

test('admin feedback action keeps each Telegram message within the size limit', async () => {
  const { db, bot, calls } = setup();
  db.upsertUser({ id: SARA.id, username: null, first_name: SARA.first_name });
  for (let i = 0; i < 5; i += 1) db.addFeedback(SARA.id, 'x'.repeat(1000));

  await bot.handleUpdate({
    update_id: 20,
    callback_query: {
      id: 'callback-1',
      from: { is_bot: false, ...ADMIN },
      message: { message_id: 20, date: 0, chat: { id: ADMIN.id, type: 'private' } },
      chat_instance: 'chat-1',
      data: 'admin:feedback',
    },
  });
  const replies = calls.filter((c) => c.method === 'sendMessage' && c.data.chat_id === ADMIN.id);
  assert.equal(replies.length, 5);
  assert.ok(replies.every((c) => c.data.text.length <= 4096));
});

test('broadcast skips banned users', async () => {
  const { send, sentTo, broadcast } = setup();
  await send(ALI, '/start');
  await send(SARA, '/start');
  await send(ADMIN, `/ban ${SARA.id}`);

  const before = sentTo(SARA.id).length;
  const result = await broadcast('Maintenance tonight');
  assert.equal(result.failed, 0);
  assert.equal(sentTo(ALI.id).at(-1).data.text, 'Maintenance tonight');
  assert.equal(sentTo(SARA.id).length, before);
});
