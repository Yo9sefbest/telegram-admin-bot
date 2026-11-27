const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');

// Compare strings in constant time so response timing doesn't leak the password.
function safeEqual(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function basicAuth(user, password) {
  return (req, res, next) => {
    const [scheme, encoded] = (req.headers.authorization || '').split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString();
      const separator = decoded.indexOf(':');
      const givenUser = decoded.slice(0, separator);
      const givenPassword = decoded.slice(separator + 1);
      if (separator > -1 && safeEqual(givenUser, user) && safeEqual(givenPassword, password)) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Bot admin", charset="UTF-8"');
    return res.status(401).json({ error: 'Authentication required' });
  };
}

function createServer({ db, broadcast, adminUser, adminPassword }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(basicAuth(adminUser, adminPassword));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/stats', (req, res) => res.json(db.stats()));
  app.get('/api/users', (req, res) => res.json(db.listUsers(200)));
  app.get('/api/feedback', (req, res) => res.json(db.listFeedback(100)));

  app.post('/api/users/:id/ban', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0 || typeof req.body?.banned !== 'boolean') {
      return res.status(400).json({ error: 'Send a numeric id and { "banned": true|false }' });
    }
    return db.setBanned(id, req.body.banned)
      ? res.json({ ok: true })
      : res.status(404).json({ error: 'User not found' });
  });

  app.post('/api/broadcast', async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 4000) {
      return res.status(400).json({ error: 'Message must be between 1 and 4000 characters' });
    }
    return res.json(await broadcast(text));
  });

  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const status = err.status === 400 || err.status === 413 ? err.status : 500;
    if (status === 500) console.error(err);
    return res.status(status).json({ error: status === 413 ? 'Request body is too large' : status === 400 ? 'Invalid JSON body' : 'Internal server error' });
  });

  return app;
}

module.exports = { createServer };
