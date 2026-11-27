const test = require('node:test');
const assert = require('node:assert/strict');
const { checkTelegram } = require('../src/telegram-check');

test('checks Telegram using getMe and returns bot information', async () => {
  const telegram = {
    callApi: async (method, payload, options) => {
      assert.equal(method, 'getMe');
      assert.deepEqual(payload, {});
      assert.ok(options.signal instanceof AbortSignal);
      return { id: 42, username: 'example_bot' };
    },
  };

  assert.deepEqual(await checkTelegram(telegram, 100), { id: 42, username: 'example_bot' });
});

test('explains an unauthorized Telegram token clearly', async () => {
  const telegram = { callApi: async () => { throw Object.assign(new Error('401: Unauthorized'), { code: 401 }); } };
  await assert.rejects(checkTelegram(telegram, 100), /Telegram rejected BOT_TOKEN \(401 Unauthorized\)/);
});

test('aborts a Telegram request that exceeds the configured timeout', async () => {
  const telegram = {
    callApi: (_method, _payload, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }),
  };
  await assert.rejects(checkTelegram(telegram, 10), /Timed out after 0\.01 seconds/);
});
