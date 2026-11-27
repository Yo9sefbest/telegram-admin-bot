const test = require('node:test');
const assert = require('node:assert/strict');
const { createDb } = require('../src/db');

test('tracks users, feedback, bans, and statistics', () => {
  const db = createDb(':memory:');
  try {
    db.upsertUser({ id: 10, username: 'first', first_name: 'First' });
    db.addFeedback(10, 'Hello');
    assert.equal(db.stats().users, 1);
    assert.equal(db.stats().feedback, 1);
    assert.equal(db.listFeedback()[0].text, 'Hello');

    db.upsertUser({ id: 10, username: 'updated', first_name: 'Updated' });
    assert.equal(db.listUsers()[0].username, 'updated');
    assert.equal(db.setBanned(10, true), true);
    assert.equal(db.isBanned(10), true);
    assert.equal(db.activeUserIds().includes(10), false);
    assert.equal(db.stats().banned, 1);

    assert.equal(db.setBanned(10, false), true);
    assert.equal(db.isBanned(10), false);
    assert.equal(db.setBanned(99, true), false);
  } finally {
    db.close();
  }
});

test('enforces the feedback foreign key', () => {
  const db = createDb(':memory:');
  try {
    assert.throws(() => db.addFeedback(404, 'orphan'), /FOREIGN KEY constraint failed/);
  } finally {
    db.close();
  }
});
