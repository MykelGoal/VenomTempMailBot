import dotenv from 'dotenv';
dotenv.config();

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  port: parseInt(process.env.PORT || '3000', 10),
  adminIds: (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '4000', 10), // 4 seconds
  mailApiBase: process.env.MAIL_API_BASE || 'https://api.mail.tm',
  backupMailApiBase: 'https://api.mail.gw',
  botUsername: process.env.BOT_USERNAME || 'VenomTempMailBot',
  dbPath: process.env.DB_PATH || './data/database.json'
};
