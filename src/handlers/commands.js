import { db } from '../storage/database.js';
import { mailService } from '../services/mailService.js';
import { OtpExtractor } from '../services/otpExtractor.js';
import { Messages } from '../ui/messages.js';
import { Keyboards } from '../ui/keyboards.js';

export class CommandHandlers {
  static async handleStart(ctx) {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name || '';
    db.getOrCreateUser(userId, username);

    const activeAcc = db.getActiveAccount(userId);
    const text = Messages.welcome(ctx.from, activeAcc?.address);
    const keyboard = Keyboards.mainMenu(activeAcc?.address);

    return ctx.reply(text, {
      parse_mode: 'HTML',
      ...keyboard
    });
  }

  static async handleNew(ctx) {
    const userId = ctx.from.id;
    await ctx.replyWithChatAction('typing');

    try {
      const account = await mailService.createAccount();
      db.saveAccount(userId, account);

      const text = Messages.emailCreated(account.address);
      const keyboard = Keyboards.emailActiveCard(account.address);

      return ctx.reply(text, {
        parse_mode: 'HTML',
        ...keyboard
      });
    } catch (err) {
      console.error('[Cmd] Error generating email:', err.message);
      return ctx.reply(`❌ <b>Failed to generate email:</b> ${err.message}`, {
        parse_mode: 'HTML'
      });
    }
  }

  static async handleCustom(ctx) {
    const userId = ctx.from.id;
    const text = ctx.message.text || '';
    const parts = text.split(' ').slice(1);
    const customPrefix = parts.join('').trim();

    if (!customPrefix) {
      return ctx.reply(Messages.customPrompt(), {
        parse_mode: 'HTML',
        ...Keyboards.backToMenu()
      });
    }

    await ctx.replyWithChatAction('typing');
    try {
      const account = await mailService.createAccount(customPrefix);
      db.saveAccount(userId, account);

      const replyText = Messages.emailCreated(account.address);
      const keyboard = Keyboards.emailActiveCard(account.address);

      return ctx.reply(replyText, {
        parse_mode: 'HTML',
        ...keyboard
      });
    } catch (err) {
      return ctx.reply(`❌ <b>Failed to create custom email:</b> ${err.message}\nTry a different username.`, {
        parse_mode: 'HTML'
      });
    }
  }

  static async handleInbox(ctx) {
    const userId = ctx.from.id;
    const activeAcc = db.getActiveAccount(userId);

    if (!activeAcc) {
      return ctx.reply('⚠️ You do not have an active email address. Use /new to generate one!', {
        ...Keyboards.mainMenu()
      });
    }

    await ctx.replyWithChatAction('typing');
    try {
      const messages = await mailService.getMessages(activeAcc.token, activeAcc.apiBase);
      if (!messages || messages.length === 0) {
        return ctx.reply(Messages.inboxEmpty(activeAcc.address), {
          parse_mode: 'HTML',
          ...Keyboards.emailActiveCard(activeAcc.address)
        });
      }

      // Check if any message is unseen and notify
      for (const m of messages) {
        if (!db.isMessageSeen(m.id)) {
          const fullMsg = await mailService.getMessageDetails(activeAcc.token, m.id, activeAcc.apiBase);
          if (fullMsg) {
            const parsed = OtpExtractor.parseEmail(fullMsg);
            db.markMessageSeen(m.id);
            if (parsed.otp) db.incrementOtpCount();
            const notifText = Messages.newEmailNotification(activeAcc.address, parsed);
            await ctx.reply(notifText, {
              parse_mode: 'HTML',
              ...Keyboards.emailActions(parsed)
            });
          }
        }
      }

      return ctx.reply(Messages.inboxList(activeAcc.address, messages.length), {
        parse_mode: 'HTML',
        ...Keyboards.inboxMessagesList(messages)
      });
    } catch (err) {
      return ctx.reply(`❌ <b>Failed to check inbox:</b> ${err.message}`, {
        parse_mode: 'HTML'
      });
    }
  }

  static async handleDelete(ctx) {
    const userId = ctx.from.id;
    const activeAcc = db.getActiveAccount(userId);

    if (!activeAcc) {
      return ctx.reply('⚠️ No active email to delete.');
    }

    mailService.deleteAccount(activeAcc.token, activeAcc.id, activeAcc.apiBase).catch(() => {});
    db.deleteAccount(userId, activeAcc.address);

    return ctx.reply(`🗑️ <b>Deleted:</b> <code>${activeAcc.address}</code>\n\nYour inbox has been wiped.`, {
      parse_mode: 'HTML',
      ...Keyboards.mainMenu()
    });
  }

  static async handlePing(ctx) {
    const start = Date.now();
    const sentMsg = await ctx.reply('⚡ <i>Pinging server...</i>', { parse_mode: 'HTML' });
    const latency = Date.now() - start;
    const stats = db.getStats();
    const hours = Math.floor(stats.uptimeSeconds / 3600);
    const mins = Math.floor((stats.uptimeSeconds % 3600) / 60);

    const text = `
⚡ <b>PONG! Bot is Active & 100% Online</b>
━━━━━━━━━━━━━━━━━━━━━
📶 <b>Bot Latency:</b> <code>${latency}ms</code>
⏱️ <b>Server Uptime:</b> <code>${hours}h ${mins}m</code>
👥 <b>Total Users:</b> <code>${stats.totalUsers}</code>
🔑 <b>OTPs Delivered:</b> <code>${stats.totalOtpsExtracted}</code>
🟢 <b>Watchdog Engine:</b> <code>Running (4s interval)</code>
━━━━━━━━━━━━━━━━━━━━━
<i>Ready to receive emails & verification codes 24/7.</i>
`.trim();

    return ctx.telegram.editMessageText(ctx.chat.id, sentMsg.message_id, undefined, text, {
      parse_mode: 'HTML',
      ...Keyboards.backToMenu()
    });
  }

  static async handleStats(ctx) {
    const stats = db.getStats();
    return ctx.reply(Messages.stats(stats), {
      parse_mode: 'HTML',
      ...Keyboards.backToMenu()
    });
  }

  static async handleHelp(ctx) {
    return ctx.reply(Messages.help(), {
      parse_mode: 'HTML',
      ...Keyboards.backToMenu()
    });
  }
}
