<div align="center">

# ⚡ VENOM TEMP MAIL

### 1-Click Disposable Email & Instant OTP Extractor for Telegram

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-22c55e?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Telegram](https://img.shields.io/badge/Telegram-Bot%20API-229ED9?style=for-the-badge&logo=telegram&logoColor=white)](https://telegram.org)
[![Telegraf](https://img.shields.io/badge/Framework-Telegraf-0088cc?style=for-the-badge)](https://telegraf.js.org)
[![Zero Ads](https://img.shields.io/badge/Ads-Zero%20Spam-10b981?style=for-the-badge)](#)
[![24/7 Online](https://img.shields.io/badge/Uptime-24%2F7%20Keep--Alive-brightgreen?style=for-the-badge)](#-247-keep-alive--uptimerobot)
[![License](https://img.shields.io/badge/License-MIT-8b5cf6?style=for-the-badge)](LICENSE)

**Stop spam, protect your privacy, and bypass website verifications in 2 seconds.**

[⚡ Quick Deploy](#-deploy-in-60-seconds) • [✨ Features](#-key-features) • [🔄 24/7 Uptime Setup](#-247-keep-alive--uptimerobot) • [📖 Commands](#-bot-commands)

</div>

---

## 💡 The Problem & The Solution

| The Old Way (Existing Bots) | The ⚡ VENOM Way |
| :--- | :--- |
| ❌ Forces you to join 5 spam channels | ✅ **Zero forced channel joins, zero spam** |
| ❌ Dumps unreadable walls of raw HTML | ✅ **Clean card layout with monospace text** |
| ❌ You have to hunt for your 6-digit OTP | ✅ **Smart OTP Engine auto-extracts code with 1-tap copy** |
| ❌ Broken and slow refresh | ✅ **Real-time push notifications within 3 seconds** |

---

## ✨ Key Features

* ⚡ **1-Click Disposable Email:** Instantly provisions a fresh, working mailbox (`/new`).
* 🔑 **Smart OTP Extractor:** Contextual regex engine extracts 4, 5, 6, and 8-digit verification codes (Netflix, Discord, OpenAI, Twitter, TikTok, WhatsApp, Telegram, etc.).
* 📋 **1-Tap To Copy:** OTP codes and email addresses are rendered in Telegram `<code>...</code>` monospaced tags for instant one-tap clipboard copy on mobile.
* 🔗 **Auto Verification Link Detection:** Automatically isolates confirmation & magic login links and places them in a high-visibility button.
* 🌐 **Multi-Domain Switcher:** Switch between active clean domains.
* ✏️ **Custom Usernames:** Create personalized disposable addresses with `/custom yourname`.
* 📜 **Multi-Inbox Management:** Switch between previously created mailboxes effortlessly.
* 🚀 **24/7 Keep-Alive Server:** Built-in Express server with `/ping` and `/health` endpoints for UptimeRobot monitoring on free tiers.

---

## 🔄 24/7 Keep-Alive & UptimeRobot Setup

You only need to host this bot once on your account. All your users can use it directly on Telegram 24/7 without needing to fork or configure anything!

To ensure it **never goes to sleep** (especially on free tiers like Render or Koyeb):

1. Deploy the bot to **Render** or **Koyeb** (or your VPS).
2. Copy your public URL (e.g. `https://venom-tempmail.onrender.com`).
3. Go to [UptimeRobot.com](https://uptimerobot.com) (100% Free):
   * Click **+ Add New Monitor**
   * **Monitor Type:** `HTTP(s)`
   * **Friendly Name:** `VENOM TempMail Bot`
   * **URL:** `https://your-app-name.onrender.com/ping`
   * **Monitoring Interval:** Every `5 minutes`
4. **Done!** UptimeRobot will ping the `/ping` endpoint every 5 minutes, keeping the bot online 24/7/365.

*(Optional)* You can also set `APP_URL=https://your-app-name.onrender.com` in your environment variables to enable the bot's built-in automatic self-pinger.

---

## ⚡ Deploy in 60 Seconds

### Deploy to Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

### Deploy to Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

### Deploy with Docker
```bash
docker run -d \
  --name venom-tempmail \
  -p 3000:3000 \
  -e BOT_TOKEN="your_telegram_bot_token" \
  -e APP_URL="https://your-public-url.com" \
  ghcr.io/mykelgoal/venom-tempmail-bot:latest
```

---

## 🚀 Local Development

### 1. Clone the repository
```bash
git clone https://github.com/MykelGoal/venom-tempmail-bot.git
cd venom-tempmail-bot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` and paste your Telegram Bot Token obtained from [@BotFather](https://t.me/botfather):
```env
BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
PORT=3000
POLL_INTERVAL_MS=4000
APP_URL=https://your-app.onrender.com
```

### 4. Start the Bot
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

---

## 📖 Bot Commands

| Command | Description |
| :--- | :--- |
| `/start` | Open the interactive VENOM dashboard |
| `/new` | Generate a new random disposable mailbox |
| `/custom <name>` | Generate an email with a custom username (e.g. `/custom venom_user`) |
| `/inbox` | Manually check & refresh active mailbox |
| `/ping` | Check server latency, uptime, and status |
| `/delete` | Delete current active mailbox & wipe messages |
| `/stats` | View live global bot stats & processed OTPs |
| `/help` | Display usage instructions and FAQ |

---

## 🏗️ Architecture

```
venom-tempmail-bot/
├── src/
│   ├── bot.js                  # Main entrypoint & Express keep-alive server
│   ├── config.js               # Environment configuration
│   ├── services/
│   │   ├── mailService.js      # Mail.tm / Mail.gw API client
│   │   ├── otpExtractor.js     # Regex & HTML parsing engine
│   │   └── poller.js           # Real-time message watchdog
│   ├── storage/
│   │   └── database.js         # Fast JSON persistent store
│   ├── ui/
│   │   ├── keyboards.js        # Interactive inline keyboards
│   │   └── messages.js         # Telegram HTML card templates
│   └── handlers/
│       ├── commands.js         # Bot slash commands
│       └── callbacks.js        # Inline button action handlers
├── Dockerfile                  # Container definition
├── docker-compose.yml          # Compose orchestration
├── render.yaml                 # Render deploy config
├── railway.json                # Railway deploy config
└── package.json
```

---

## 🛡️ Privacy & Security

* **Zero Persistent Email Storage:** Emails are stored only temporarily in memory/cache while active.
* **No Account Tracking:** No phone numbers or personal information required.
* **Open Source:** Fully auditable code.

---

## 👨‍💻 Author

**MR VENOM (Mychael Goal)**
* GitHub: [@MykelGoal](https://github.com/MykelGoal)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
