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
    console.log(`[Poller] Live inbox watchdog active across 6 networks (Interval: ${config.pollIntervalMs}ms)`);
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
      console.error('[Poller] Error in poll cycle:', err.message);
    } finally {
      if (this.isRunning) {
        this.timer = setTimeout(() => this.tick(), config.pollIntervalMs);
      }
    }
  }

  async pollAllActiveInboxes() {
    const activeAccounts = db.getAllActiveAccounts();
    if (!activeAccounts || activeAccounts.length === 0) return;

    const batchSize = 5;
    for (let i = 0; i < activeAccounts.length; i += batchSize) {
      const batch = activeAccounts.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(acc => this.checkUserInbox(acc)));
    }
  }

  async checkUserInbox(account) {
    try {
      const messages = await mailService.getMessages(account);
      if (!messages || messages.length === 0) return;

      for (const msgSummary of messages) {
        const messageKey = `${account.address}_${msgSummary.id}`;
        if (db.isMessageSeen(messageKey)) continue;

        // Fetch full email content
        const fullMsg = await mailService.getMessageDetails(account, msgSummary.id);
        if (!fullMsg) continue;

        // Parse with OTP Extractor
        const parsed = OtpExtractor.parseEmail(fullMsg);
        db.markMessageSeen(messageKey);

        if (parsed.otp) {
          db.incrementOtpCount();
        }

        // Format message for Telegram
        const text = Messages.newEmailNotification(account.address, parsed);
        const keyboard = Keyboards.emailActions(parsed);

        // Send to user with fallback
        try {
          await this.bot.telegram.sendMessage(account.userId, text, {
            parse_mode: 'HTML',
            disable_web_page_preview: false,
            ...keyboard
          });
        } catch (sendErr) {
          if (sendErr.message && sendErr.message.includes("can't parse entities")) {
            const plainText = `⚡ NEW EMAIL RECEIVED\n\nTo: ${account.address}\nFrom: ${parsed.sender}\nSubject: ${parsed.subject}\n${parsed.otp ? `\n🔑 OTP: ${parsed.otp}\n` : ''}\nSnippet:\n${parsed.preview}`;
            await this.bot.telegram.sendMessage(account.userId, plainText, { ...keyboard });
          } else if (sendErr.response?.error_code === 403) {
            console.warn(`[Poller] User ${account.userId} blocked the bot.`);
            return;
          } else {
            throw sendErr;
          }
        }

        console.log(`[Poller] Delivered email to ${account.userId} for ${account.address} (OTP: ${parsed.otp || 'None'})`);
      }
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') {
        console.error(`[Poller] Inbox check error for ${account.address}:`, err.message);
      }
    }
  }
}
