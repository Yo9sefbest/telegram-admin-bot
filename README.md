# Telegram Admin Bot

A Telegram bot with an English-language command interface and a password-protected web dashboard. The bot stores users and feedback in SQLite.

Built with Node.js, Telegraf, Express, and SQLite.

## Features

- `/start` and `/help` commands
- `/feedback <text>` stores feedback for the dashboard and notifies configured Telegram admins
- Telegram admin commands: `/admin`, `/stats`, `/broadcast`, `/ban`, and `/unban`
- Web dashboard with user and feedback lists, stats, ban/unban controls, and a broadcast form
- Broadcasts skip banned users and send at a rate of about 20 messages per second
- Basic Auth protects the dashboard and API; the dashboard binds to localhost by default
- Automated tests run without a Telegram token

**Conversation note:** the bot handles commands and `/feedback`. It does not respond to ordinary text messages. To send a message that appears in the dashboard, use `/feedback <your message>`.

## Requirements

- Node.js 20 or later
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and replace the sample values:

   ```env
   BOT_TOKEN=your_bot_token_from_botfather
   ADMIN_IDS=your_numeric_telegram_user_id
   ADMIN_USER=admin
   ADMIN_PASSWORD=choose_a_password_at_least_8_characters_long
   HOST=127.0.0.1
   PORT=3000
   DB_PATH=./data/bot.db
   ```

   `ADMIN_IDS` accepts comma-separated Telegram user IDs and controls access to Telegram admin commands. The dashboard login uses `ADMIN_USER` and `ADMIN_PASSWORD`. Keep `.env` private; it contains your bot token and dashboard password.

3. Check the token and connectivity without starting the bot or dashboard:

   ```sh
   npm run check:telegram
   ```

   This contacts Telegram and fails with a clear error if the token is rejected or Telegram does not respond within 15 seconds.

4. Start the bot and dashboard:

   ```sh
   npm start
   ```

   Keep the terminal open. Once startup completes, visit [http://127.0.0.1:3000](http://127.0.0.1:3000) and log in with `ADMIN_USER` and `ADMIN_PASSWORD`. If you change `PORT`, use that port in the URL.

On Windows PowerShell, copy the example file with:

```powershell
Copy-Item .env.example .env
```

## Bot commands

| Command | Access | Description |
| --- | --- | --- |
| `/start` | Everyone | Welcome message |
| `/help` | Everyone | List of public commands |
| `/feedback <text>` | Everyone | Save feedback and notify configured admins |
| `/admin` | Admins | Open the Telegram admin menu |
| `/stats` | Admins | Show user and feedback counts |
| `/broadcast <text>` | Admins | Send a message to all non-banned users |
| `/ban <user_id>` | Admins | Ban a known user |
| `/unban <user_id>` | Admins | Unban a known user |

## Dashboard API

All routes require Basic Auth.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/stats` | User, active, banned, and feedback counts |
| `GET` | `/api/users` | Up to 200 users |
| `GET` | `/api/feedback` | Up to 100 latest feedback items |
| `POST` | `/api/users/:id/ban` | Ban or unban with `{ "banned": true }` or `{ "banned": false }` |
| `POST` | `/api/broadcast` | Send `{ "text": "Hello" }` to active users |

## Tests

Run the automated tests with:

```sh
npm test
```

## Project layout

```text
src/
  index.js           Starts Telegram polling and the dashboard
  bot.js             Telegram commands and handlers
  messages.js        English bot messages
  telegram-check.js  Telegram connection check with a timeout
  check-telegram.js  Standalone token and connectivity check
  server.js          Express dashboard server and API
  db.js              SQLite schema and queries
public/
  index.html         Dashboard interface
test/                Automated bot, database, API, and connection-check tests
```

## Deployment

Run under a process manager on a server with Node.js 20 or later. The dashboard defaults to `127.0.0.1`, which keeps it local to the machine. If you expose it through a reverse proxy, use HTTPS because Basic Auth credentials are sent with each request.

## License

MIT
