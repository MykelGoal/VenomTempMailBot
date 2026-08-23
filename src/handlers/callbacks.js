import { db } from '../storage/database.js';
import { mailService } from '../services/mailService.js';
import { OtpExtractor } from '../services/otpExtractor.js';
import { Messages } from '../ui/messages.js';
import { Keyboards } from '../ui/keyboards.js';

async function editMessageTextSafe(ctx, text, extra = {}) {
  try {
    return await ctx.editMessageText(text, extra);
  } catch (err) {
    if (err.message && err.message.includes('message is not modified')) {
      return;
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
        const messages = await mailService.getMessages(activeAcc);
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        
        if (!messages || messages.length === 0) {
          await ctx.answerCbQuery(`📭 Checked at ${time} (Empty)`);
          await editMessageTextSafe(ctx, Messages.inboxEmpty(activeAcc.address), {
            parse_mode: 'HTML',
            ...Keyboards.emailActiveCard(activeAcc.address)
          });
        } else {
          await ctx.answerCbQuery(`📬 ${messages.length} message(s) in inbox`);

          // Deliver any unseen message immediately
          for (const m of messages) {
            const messageKey = `${activeAcc.address}_${m.id}`;
            if (!db.isMessageSeen(messageKey)) {
              const fullMsg = await mailService.getMessageDetails(activeAcc, m.id);
              if (fullMsg) {
                const parsed = OtpExtractor.parseEmail(fullMsg);
                db.markMessageSeen(messageKey);
                if (parsed.otp) db.incrementOtpCount();
                const notifText = Messages.newEmailNotification(activeAcc.address, parsed);
                await ctx.reply(notifText, {
                  parse_mode: 'HTML',
                  ...Keyboards.emailActions(parsed)
                });
              }
            }
          }

          await editMessageTextSafe(ctx, Messages.inboxList(activeAcc.address, messages.length), {
            parse_mode: 'HTML',
            ...Keyboards.inboxMessagesList(messages)
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

    // Set Domain & Generate by Index
    bot.action(/^btn_set_dm_(\d+)$/, async (ctx) => {
      const domainIndex = parseInt(ctx.match[1], 10);
      const domains = await mailService.getDomains();
      const selectedDomain = domains[domainIndex] || domains[0];

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

    // Switch Active Account by ID
    bot.action(/^btn_sw_(.+)$/, async (ctx) => {
      const accountId = ctx.match[1];
      const userId = ctx.from.id;
      const user = db.getUser(userId);

      const targetAccount = user?.accounts?.find(a => a.id === accountId);
      if (!targetAccount) {
        return ctx.answerCbQuery('Inbox not found');
      }

      db.setActiveEmail(userId, targetAccount.address);
      await ctx.answerCbQuery(`Switched to ${targetAccount.address}`);

      const text = Messages.emailCreated(targetAccount.address);
      await editMessageTextSafe(ctx, text, {
        parse_mode: 'HTML',
        ...Keyboards.emailActiveCard(targetAccount.address)
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
      mailService.deleteAccount(activeAcc).catch(() => {});
      db.deleteAccount(userId, activeAcc.address);

      const activeNow = db.getActiveAccount(userId);
      const text = `🗑️ <b>Deleted:</b> <code>${activeAcc.address}</code>\n\nYour inbox has been wiped.`;

      await editMessageTextSafe(ctx, text, {
        parse_mode: 'HTML',
        ...Keyboards.mainMenu(activeNow?.address)
      });
    });

    // View Full Message Details
    bot.action(/^btn_view_(.+)$/, async (ctx) => {
      const msgId = ctx.match[1];
      const userId = ctx.from.id;
      const activeAcc = db.getActiveAccount(userId);

      if (!activeAcc) {
        return ctx.answerCbQuery('Session expired', { show_alert: true });
      }

      await ctx.answerCbQuery('Loading full email...');
      try {
        const fullMsg = await mailService.getMessageDetails(activeAcc, msgId);
        if (!fullMsg) {
          return ctx.reply('⚠️ Message is no longer available on the server.');
        }

        const parsed = OtpExtractor.parseEmail(fullMsg);
        const text = Messages.fullEmailView(parsed);

        try {
          await ctx.reply(text, {
            parse_mode: 'HTML',
            ...Keyboards.emailActions(parsed)
          });
        } catch (sendErr) {
          const plain = `📄 FULL EMAIL CONTENT\n\nFrom: ${parsed.sender}\nSubject: ${parsed.subject}\nDate: ${new Date(parsed.createdAt).toLocaleString()}\n\n${parsed.fullText.slice(0, 2800)}`;
          await ctx.reply(plain, Keyboards.emailActions(parsed));
        }
      } catch (err) {
        await ctx.reply(`❌ Failed to view message: ${err.message}`);
      }
    });

    // Delete Individual Message
    bot.action(/^btn_del_(.+)$/, async (ctx) => {
      const msgId = ctx.match[1];
      const userId = ctx.from.id;
      const activeAcc = db.getActiveAccount(userId);

      if (activeAcc) {
        mailService.deleteMessage(activeAcc, msgId).catch(() => {});
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
