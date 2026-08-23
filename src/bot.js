import { Telegraf } from 'telegraf';
import express from 'express';
import axios from 'axios';
import { config } from './config.js';
import { db } from './storage/database.js';
import { CommandHandlers } from './handlers/commands.js';
import { CallbackHandlers } from './handlers/callbacks.js';
import { InboxPoller } from './services/poller.js';

// Global error traps to guarantee 100% server stability
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Safety] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process Safety] Uncaught Exception:', err);
});

async function bootstrap() {
  console.log('⚡ Starting VENOM TempMail Bot Engine...');

  if (!config.botToken) {
    console.warn('⚠️ [WARNING] BOT_TOKEN is not set in environment or .env file!');
    console.warn('👉 Please set BOT_TOKEN in .env to connect with Telegram.');
  }

  // 1. Initialize Telegraf Bot
  const bot = new Telegraf(config.botToken || 'DUMMY_TOKEN_FOR_INITIALIZATION');

  // Register Slash Commands
  bot.start(CommandHandlers.handleStart);
  bot.command('new', CommandHandlers.handleNew);
  bot.command('inbox', CommandHandlers.handleInbox);
  bot.command('custom', CommandHandlers.handleCustom);
  bot.command('delete', CommandHandlers.handleDelete);
  bot.command('ping', CommandHandlers.handlePing);
  bot.command('stats', CommandHandlers.handleStats);
  bot.command('help', CommandHandlers.handleHelp);

  // Register Interactive Inline Callbacks
  await CallbackHandlers.register(bot);

  // Telegraf Error Boundary
  bot.catch((err, ctx) => {
    console.error(`[Telegraf Error] Error during update ${ctx.updateType}:`, err.message);
  });

  // 2. Initialize Background Poller
  const poller = new InboxPoller(bot);

  // 3. Initialize Express Web Server (UptimeRobot / Health Check / Keep-Alive)
  const app = express();
  app.use(express.json());

  // Root Dashboard
  app.get('/', (req, res) => {
    const stats = db.getStats();
    res.json({
      status: 'online',
      message: '⚡ VENOM TempMail Server is running 24/7',
      version: '1.0.0',
      author: 'MR VENOM (@MykelGoal)',
      timestamp: new Date().toISOString(),
      stats
    });
  });

  // Dedicated UptimeRobot Keep-Alive Endpoint
  app.get(['/ping', '/health', '/keep-alive'], (req, res) => {
    const stats = db.getStats();
    res.status(200).json({
      status: 'ok',
      pong: true,
      timestamp: Date.now(),
      uptime: `${Math.floor(stats.uptimeSeconds / 3600)}h ${Math.floor((stats.uptimeSeconds % 3600) / 60)}m`,
      totalUsers: stats.totalUsers,
      totalOtps: stats.totalOtpsExtracted
    });
  });

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`🌐 Uptime/Keep-Alive server listening on http://0.0.0.0:${config.port}`);
  });

  // 4. Auto Self-Ping Keep-Alive Worker (for Render/Koyeb free tiers)
  const appUrl = process.env.APP_URL || process.env.SELF_PING_URL;
  if (appUrl) {
    console.log(`🔄 Auto self-ping enabled for: ${appUrl}/ping (every 10m)`);
    setInterval(async () => {
      try {
        await axios.get(`${appUrl.replace(/\/$/, '')}/ping`, { timeout: 8000 });
        console.log(`[Keep-Alive] Self-ping successful at ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        console.warn(`[Keep-Alive] Self-ping warning: ${err.message}`);
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  // 5. Start Bot & Poller
  if (config.botToken && config.botToken !== 'DUMMY_TOKEN_FOR_INITIALIZATION') {
    poller.start();
    bot.launch()
      .then(() => console.log('🤖 Telegram Bot connected and listening!'))
      .catch((err) => console.error('❌ Failed to launch Telegram Bot:', err.message));
  } else {
    console.log('ℹ️ Bot token missing or dummy. Server running in standby mode.');
  }

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 Gracefully shutting down...');
    poller.stop();
    server.close();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

bootstrap().catch(err => {
  console.error('Fatal initialization error:', err);
});
