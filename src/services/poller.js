import { db } from '../storage/database.js';
import { mailService } from './mailService.js';
import { OtpExtractor } from './otpExtractor.js';
import { Messages } from '../ui/messages.js';
import { Keyboards } from '../ui/keyboards.js';
import { config } from '../config.js';

export class InboxPoller {
  constructor(bot) {
    this.bot = bot;
    this.isRunning = false;
    this.timer = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Poller] Live inbox watcher started (Interval: ${config.pollIntervalMs}ms)`);
    this.tick();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    console.log('[Poller] Live inbox watcher stopped.');
  }

  async tick() {
    if (!this.isRunning) return;

    try {
      await this.pollAllActiveInboxes();
    } catch (err) {
      console.error('[Poller] Error in poll loop:', err.message);
    } finally {
      if (this.isRunning) {
        this.timer = setTimeout(() => this.tick(), config.pollIntervalMs);
      }
    }
  }

  async pollAllActiveInboxes() {
    const activeAccounts = db.getAllActiveAccounts();
    if (!activeAccounts || activeAccounts.length === 0) return;

    // Process accounts concurrently in batches of 5 to avoid socket throttling
    const batchSize = 5;
    for (let i = 0; i < activeAccounts.length; i += batchSize) {
      const batch = activeAccounts.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(acc => this.checkUserInbox(acc)));
    }
  }

  async checkUserInbox(account) {
    try {
      const messages = await mailService.getMessages(account.token);
      if (!messages || messages.length === 0) return;

      for (const msgSummary of messages) {
        if (db.isMessageSeen(msgSummary.id)) continue;

        // Fetch full email content
        const fullMsg = await mailService.getMessageDetails(account.token, msgSummary.id);
        if (!fullMsg) continue;

        // Parse with OTP Extractor
        const parsed = OtpExtractor.parseEmail(fullMsg);
        db.markMessageSeen(msgSummary.id);

        if (parsed.otp) {
          db.incrementOtpCount();
        }

        // Format message for Telegram
        const text = Messages.newEmailNotification(account.address, parsed);
        const keyboard = Keyboards.emailActions(parsed);

        // Send to user
        await this.bot.telegram.sendMessage(account.userId, text, {
          parse_mode: 'HTML',
          disable_web_page_preview: false,
          ...keyboard
        });

        console.log(`[Poller] Dispatched new email to user ${account.userId} (OTP: ${parsed.otp || 'None'})`);
      }
    } catch (err) {
      // If token expired or account removed, quietly skip
      if (err.response?.status === 401) {
        console.warn(`[Poller] Account ${account.address} unauthorized/expired.`);
      } else {
        console.error(`[Poller] Failed to check inbox for ${account.address}:`, err.message);
      }
    }
  }
}
