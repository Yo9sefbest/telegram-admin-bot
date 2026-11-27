const test = require('node:test');
const assert = require('node:assert/strict');
const { createDb } = require('../src/db');
const { createServer } = require('../src/server');

const AUTH = `Basic ${Buffer.from('admin:s3cret-pass').toString('base64')}`;

async function start() {
  const db = createDb(':memory:');
  db.upsertUser({ id: 10, username: 'ali', first_name: 'Ali' });
  const broadcasts = [];
  const app = createServer({
    db,
    broadcast: async (text) => {
      broadcasts.push(text);
      return { sent: 1, failed: 0 };
    },
    adminUser: 'admin',
    adminPassword: 's3cret-pass',
  });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, options = {}) =>
    fetch(base + path, {
      ...options,
      headers: { Authorization: AUTH, 'Content-Type': 'application/json', ...options.headers },
    });
  return { db, broadcasts, call, base, close: () => server.close() };
}

test('rejects requests without valid credentials', async () => {
  const { base, close } = await start();
  const none = await fetch(`${base}/api/stats`);
  const wrong = await fetch(`${base}/api/stats`, {
    headers: { Authorization: `Basic ${Buffer.from('admin:nope').toString('base64')}` },
  });
  assert.equal(none.status, 401);
  assert.equal(wrong.status, 401);
  close();
});

test('returns stats and users', async () => {
  const { call, close } = await start();
  const stats = await (await call('/api/stats')).json();
  const users = await (await call('/api/users')).json();
  assert.equal(stats.users, 1);
  assert.equal(users[0].username, 'ali');
  close();
});

test('ban endpoint validates input and updates the user', async () => {
  const { db, call, close } = await start();
  const bad = await call('/api/users/10/ban', { method: 'POST', body: JSON.stringify({ banned: 'yes' }) });
  assert.equal(bad.status, 400);

  const missing = await call('/api/users/999/ban', { method: 'POST', body: JSON.stringify({ banned: true }) });
  assert.equal(missing.status, 404);

  const ok = await call('/api/users/10/ban', { method: 'POST', body: JSON.stringify({ banned: true }) });
  assert.equal(ok.status, 200);
  assert.equal(db.isBanned(10), true);
  close();
});

test('broadcast requires text and calls the bot', async () => {
  const { broadcasts, call, close } = await start();
  const empty = await call('/api/broadcast', { method: 'POST', body: JSON.stringify({ text: '  ' }) });
  assert.equal(empty.status, 400);

  const ok = await call('/api/broadcast', { method: 'POST', body: JSON.stringify({ text: 'Hello all' }) });
  assert.deepEqual(await ok.json(), { sent: 1, failed: 0 });
  assert.deepEqual(broadcasts, ['Hello all']);
  close();
});
