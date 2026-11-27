# telegram-admin-bot

I created a Telegram bot with a built-in admin panel. Users can chat with the bot and send feedback; admins manage everything from Telegram itself or from a small password-protected web dashboard.

Built with **Node.js, Telegraf, Express and SQLite**.

## Features

- Automatic language detection based on the user's Telegram language
- `/feedback` inbox: messages are stored and forwarded to admins instantly
- Admin tools inside Telegram: `/admin` (button menu), `/stats`, `/broadcast`, `/ban`, `/unban`
- Web dashboard: live stats, user list with ban/unban, feedback list, broadcast form
- Safe broadcasting: rate-limited (about 20 messages/second) and skips banned users
- Security basics: admin IDs allow-list, Basic Auth with constant-time comparison, dashboard listens on localhost by default, XSS-safe rendering
- Automated tests that run without a Telegram token (`npm test`)

## Quick start

```bash
git clone https://github.com/<your-username>/telegram-admin-bot.git
cd telegram-admin-bot
npm install
cp .env.example .env     # then fill in your values
npm start
```

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token into `BOT_TOKEN`.
2. Get your numeric Telegram ID from [@userinfobot](https://t.me/userinfobot) and put it in `ADMIN_IDS`.
3. Choose a strong `ADMIN_PASSWORD` for the dashboard.
4. Open `http://127.0.0.1:3000` and log in with `ADMIN_USER` / `ADMIN_PASSWORD`.

## Commands

| Command | Who | What it does |
| --- | --- | --- |
| `/start`, `/help` | everyone | Greeting and help in the user's language |
| `/feedback <text>` | everyone | Sends feedback to the admins |
| `/admin` | admins | Opens the admin button menu |
| `/stats` | admins | Shows user and feedback counts |
| `/broadcast <text>` | admins | Sends a message to all non-banned users |
| `/ban <id>`, `/unban <id>` | admins | Blocks or unblocks a user |

## Dashboard API

All routes need Basic Auth.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/stats` | Counts of users, active users, banned users and feedback |
| GET | `/api/users` | Latest 200 users |
| GET | `/api/feedback` | Latest 100 feedback messages |
| POST | `/api/users/:id/ban` | Body: `{ "banned": true }` |
| POST | `/api/broadcast` | Body: `{ "text": "Hello" }` |

## Project structure

```
src/
  index.js     entry point: reads config, starts the bot and the dashboard
  bot.js       Telegraf handlers (public and admin commands, broadcast)
  server.js    Express app: Basic Auth + JSON API + static dashboard
  db.js        SQLite schema and prepared queries
  i18n.js      Messages I made
public/
  index.html   dashboard (vanilla JS, light and dark mode)
test/          node:test suites for the bot and the API
```

## Deploying

Run it on any VPS with Node 20+ using a process manager such as `pm2 start src/index.js --name tg-bot`. If you expose the dashboard to the internet, put it behind HTTPS (Caddy or nginx), because Basic Auth sends credentials in every request.

## License

MIT
