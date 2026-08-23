import { db } from '../storage/database.js';
import { mailService } from '../services/mailService.js';
import { OtpExtractor } from '../services/otpExtractor.js';
import { Messages } from '../ui/messages.js';
import { Keyboards } from '../ui/keyboards.js';

/**
 * Safely edits message text and ignores Telegram's 'message is not modified' error.
 */
async function editMessageTextSafe(ctx, text, extra = {}) {
  try {
    return await ctx.editMessageText(text, extra);
  } catch (err) {
    if (err.message && err.message.includes('message is not modified')) {
      return; // Safe to ignore
    }
    throw err;
  }
}

export class CallbackHandlers {
  static async register(bot) {
    // Generate Random
    bot.action('btn_generate_random', async (ctx) => {
      await ctx.answerCbQuery('⚡ Provisioning email...');
      const userId = ctx.from.id;
      try {
        const account = await mailService.createAccount();
        db.saveAccount(userId, account);
        const text = Messages.emailCreated(account.address);
        await editMessageTextSafe(ctx, text, {
          parse_mode: 'HTML',
          ...Keyboards.emailActiveCard(account.address)
        });
      } catch (err) {
        await ctx.reply(`❌ Failed to create email: ${err.message}`);
      }
    });

    // Refresh Inbox
    bot.action('btn_refresh_inbox', async (ctx) => {
      const userId = ctx.from.id;
      const activeAcc = db.getActiveAccount(userId);

      if (!activeAcc) {
        await ctx.answerCbQuery('No active email');
        return editMessageTextSafe(ctx, '⚠️ No active email. Generate one first!', {
          ...Keyboards.mainMenu()
        });
      }

      try {
        const messages = await mailService.getMessages(activeAcc.token);
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        
        if (!messages || messages.length === 0) {
          await ctx.answerCbQuery(`📭 Inbox checked at ${time} (Empty)`);
          await editMessageTextSafe(ctx, Messages.inboxEmpty(activeAcc.address), {
            parse_mode: 'HTML',
            ...Keyboards.emailActiveCard(activeAcc.address)
          });
        } else {
          await ctx.answerCbQuery(`📬 ${messages.length} message(s) in inbox`);
          await editMessageTextSafe(ctx, Messages.inboxList(activeAcc.address, messages.length), {
            parse_mode: 'HTML',
            ...Keyboards.emailActiveCard(activeAcc.address)
          });
        }
      } catch (err) {
        await ctx.answerCbQuery('Refresh failed');
        console.error('[Callback] Error refreshing inbox:', err.message);
      }
    });

    // Custom Prompt
    bot.action('btn_custom_prompt', async (ctx) => {
      await ctx.answerCbQuery();
      await editMessageTextSafe(ctx, Messages.customPrompt(), {
        parse_mode: 'HTML',
        ...Keyboards.backToMenu()
      });
    });

    // List Domains
    bot.action('btn_list_domains', async (ctx) => {
      await ctx.answerCbQuery();
      try {
        const domains = await mailService.getDomains();
        await editMessageTextSafe(ctx, '🌐 <b>Select a domain for your temporary mailbox:</b>', {
          parse_mode: 'HTML',
          ...Keyboards.domainList(domains)
        });
      } catch (err) {
        await ctx.reply(`❌ Could not fetch domains: ${err.message}`);
      }
    });

    // Set Domain & Generate
    bot.action(/^btn_set_domain_(.+)$/, async (ctx) => {
      const selectedDomain = ctx.match[1];
      await ctx.answerCbQuery(`Selected @${selectedDomain}`);
      const userId = ctx.from.id;

      try {
        const account = await mailService.createAccount(null, selectedDomain);
        db.saveAccount(userId, account);
        const text = Messages.emailCreated(account.address);
        await editMessageTextSafe(ctx, text, {
          parse_mode: 'HTML',
          ...Keyboards.emailActiveCard(account.address)
        });
      } catch (err) {
        await ctx.reply(`❌ Error creating account on @${selectedDomain}: ${err.message}`);
      }
    });

    // My Accounts List
    bot.action('btn_my_accounts', async (ctx) => {
      await ctx.answerCbQuery();
      const userId = ctx.from.id;
      const user = db.getUser(userId);

      if (!user || !user.accounts || user.accounts.length === 0) {
        return editMessageTextSafe(ctx, '📭 You do not have any saved inboxes yet.', {
          ...Keyboards.mainMenu()
        });
      }

      await editMessageTextSafe(ctx, '📜 <b>Your Inboxes:</b>\nSelect an address to set as active:', {
        parse_mode: 'HTML',
        ...Keyboards.accountsList(user.accounts, user.activeEmail)
      });
    });

    // Switch Active Account
    bot.action(/^btn_switch_(.+)$/, async (ctx) => {
      const emailAddress = ctx.match[1];
      const userId = ctx.from.id;
      db.setActiveEmail(userId, emailAddress);
      await ctx.answerCbQuery(`Switched to ${emailAddress}`);

      const text = Messages.emailCreated(emailAddress);
      await editMessageTextSafe(ctx, text, {
        parse_mode: 'HTML',
        ...Keyboards.emailActiveCard(emailAddress)
      });
    });

    // Delete Current Account
    bot.action('btn_delete_current', async (ctx) => {
      const userId = ctx.from.id;
      const activeAcc = db.getActiveAccount(userId);

      if (!activeAcc) {
        await ctx.answerCbQuery('No active email');
        return;
      }

      await ctx.answerCbQuery('Deleting...');
      mailService.deleteAccount(activeAcc.token, activeAcc.id).catch(() => {});
      db.deleteAccount(userId, activeAcc.address);

      const activeNow = db.getActiveAccount(userId);
      const text = `🗑️ <b>Deleted:</b> <code>${activeAcc.address}</code>\n\nYour inbox has been wiped.`;

      await editMessageTextSafe(ctx, text, {
        parse_mode: 'HTML',
        ...Keyboards.mainMenu(activeNow?.address)
      });
    });

    // View Full Message Details
    bot.action(/^btn_view_msg_(.+)$/, async (ctx) => {
      const msgId = ctx.match[1];
      const userId = ctx.from.id;
      const activeAcc = db.getActiveAccount(userId);

      if (!activeAcc) {
        return ctx.answerCbQuery('Session expired', { show_alert: true });
      }

      await ctx.answerCbQuery('Loading full email...');
      try {
        const fullMsg = await mailService.getMessageDetails(activeAcc.token, msgId);
        if (!fullMsg) {
          return ctx.reply('⚠️ Message is no longer available on the server.');
        }

        const parsed = OtpExtractor.parseEmail(fullMsg);
        const text = Messages.fullEmailView(parsed);

        await ctx.reply(text, {
          parse_mode: 'HTML',
          ...Keyboards.emailActions(parsed)
        });
      } catch (err) {
        await ctx.reply(`❌ Failed to view message: ${err.message}`);
      }
    });

    // Delete Individual Message
    bot.action(/^btn_del_msg_(.+)$/, async (ctx) => {
      const msgId = ctx.match[1];
      const userId = ctx.from.id;
      const activeAcc = db.getActiveAccount(userId);

      if (activeAcc) {
        mailService.deleteMessage(activeAcc.token, msgId).catch(() => {});
      }

      await ctx.answerCbQuery('Message deleted');
      try {
        await ctx.deleteMessage();
      } catch {
        await editMessageTextSafe(ctx, '🗑️ <i>Message deleted.</i>', { parse_mode: 'HTML' });
      }
    });

    // Bot Stats
    bot.action('btn_stats', async (ctx) => {
      await ctx.answerCbQuery();
      const stats = db.getStats();
      await editMessageTextSafe(ctx, Messages.stats(stats), {
        parse_mode: 'HTML',
        ...Keyboards.backToMenu()
      });
    });

    // Help
    bot.action('btn_help', async (ctx) => {
      await ctx.answerCbQuery();
      await editMessageTextSafe(ctx, Messages.help(), {
        parse_mode: 'HTML',
        ...Keyboards.backToMenu()
      });
    });

    // Main Menu
    bot.action('btn_main_menu', async (ctx) => {
      await ctx.answerCbQuery();
      const userId = ctx.from.id;
      const activeAcc = db.getActiveAccount(userId);
      const text = Messages.welcome(ctx.from, activeAcc?.address);
      await editMessageTextSafe(ctx, text, {
        parse_mode: 'HTML',
        ...Keyboards.mainMenu(activeAcc?.address)
      });
    });
  }
}
