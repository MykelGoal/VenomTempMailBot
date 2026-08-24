import { Markup } from 'telegraf';

export class Keyboards {
  /**
   * Main Interactive Dashboard Menu
   */
  static mainMenu(activeEmail = null) {
    const buttons = [];

    if (!activeEmail) {
      buttons.push([
        Markup.button.callback('⚡ Generate Email', 'btn_generate_random'),
        Markup.button.callback('✏️ Custom Prefix', 'btn_custom_prompt')
      ]);
    } else {
      buttons.push([
        Markup.button.callback('📬 Refresh Inbox', 'btn_refresh_inbox'),
        Markup.button.callback('⚡ New Address', 'btn_generate_random')
      ]);
      buttons.push([
        Markup.button.callback('✏️ Custom Name', 'btn_custom_prompt'),
        Markup.button.callback('🌐 Switch Domain', 'btn_list_domains')
      ]);
      buttons.push([
        Markup.button.callback('📜 My Inboxes', 'btn_my_accounts'),
        Markup.button.callback('🗑️ Delete Current', 'btn_delete_current')
      ]);
    }

    buttons.push([
      Markup.button.callback('⚡ Explore VENOM Bots', 'btn_venom_series'),
      Markup.button.callback('📊 Stats', 'btn_stats')
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * YouTube Subscription Gate Keyboard
   */
  static subscriptionGate() {
    return Markup.inlineKeyboard([
      [
        Markup.button.url('🔴 Subscribe on YouTube (@venommdbot)', 'https://www.youtube.com/@venommdbot?sub_confirmation=1')
      ],
      [
        Markup.button.callback('✅ I Have Subscribed / Unlock Bot', 'btn_verify_sub')
      ]
    ]);
  }

  /**
   * Explore VENOM Series Actions
   */
  static exploreSeries() {
    return Markup.inlineKeyboard([
      [
        Markup.button.url('📺 Subscribe on YouTube (@venommdbot)', 'https://www.youtube.com/@venommdbot?sub_confirmation=1')
      ],
      [
        Markup.button.callback('⬅️ Back to Menu', 'btn_main_menu')
      ]
    ]);
  }

  /**
   * Action buttons for active email card
   */
  static emailActiveCard(address) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📬 Refresh Inbox', 'btn_refresh_inbox'),
        Markup.button.callback('⚡ New Email', 'btn_generate_random')
      ],
      [
        Markup.button.callback('✏️ Custom Prefix', 'btn_custom_prompt'),
        Markup.button.callback('🌐 Switch Domain', 'btn_list_domains')
      ],
      [
        Markup.button.callback('🗑️ Delete Address', 'btn_delete_current'),
        Markup.button.callback('📜 All Inboxes', 'btn_my_accounts')
      ]
    ]);
  }

  /**
   * Action buttons for an incoming email / OTP notification card
   */
  static emailActions(parsed) {
    const rows = [];

    if (parsed.verifyLink && (parsed.verifyLink.startsWith('http://') || parsed.verifyLink.startsWith('https://'))) {
      const label = parsed.linkLabel || '🔗 1-Tap Verify Link';
      rows.push([
        Markup.button.url(label, parsed.verifyLink)
      ]);
    }

    rows.push([
      Markup.button.callback('📖 Full Email', `btn_view_${parsed.id}`),
      Markup.button.callback('🗑️ Delete', `btn_del_${parsed.id}`)
    ]);

    rows.push([
      Markup.button.callback('📬 Back to Inbox', 'btn_refresh_inbox')
    ]);

    return Markup.inlineKeyboard(rows);
  }

  /**
   * Action buttons for listing messages found in inbox
   */
  static inboxMessagesList(messages = []) {
    const rows = [];

    for (const m of messages.slice(0, 5)) {
      const subject = m.subject || '(No Subject)';
      const cleanSubject = subject.length > 24 ? subject.slice(0, 24) + '...' : subject;
      rows.push([
        Markup.button.callback(`📩 ${cleanSubject}`, `btn_view_${m.id}`)
      ]);
    }

    rows.push([
      Markup.button.callback('🔄 Refresh Inbox', 'btn_refresh_inbox'),
      Markup.button.callback('⚡ Generate New', 'btn_generate_random')
    ]);

    rows.push([
      Markup.button.callback('⬅️ Back to Menu', 'btn_main_menu')
    ]);

    return Markup.inlineKeyboard(rows);
  }

  /**
   * Domain selection keyboard
   */
  static domainList(domains = []) {
    const rows = domains.map((d, index) => [
      Markup.button.callback(`🌐 @${d}`, `btn_set_dm_${index}`)
    ]);
    rows.push([Markup.button.callback('⬅️ Back to Dashboard', 'btn_main_menu')]);
    return Markup.inlineKeyboard(rows);
  }

  /**
   * User accounts list keyboard for switching
   */
  static accountsList(accounts = [], activeEmail = '') {
    const rows = accounts.map(acc => {
      const isCurrent = acc.address === activeEmail;
      const label = `${isCurrent ? '🟢 Active: ' : '⚪ '}${acc.address}`;
      return [Markup.button.callback(label, `btn_sw_${acc.id}`)];
    });

    rows.push([
      Markup.button.callback('⚡ Generate New', 'btn_generate_random'),
      Markup.button.callback('⬅️ Back', 'btn_main_menu')
    ]);
    return Markup.inlineKeyboard(rows);
  }

  /**
   * Back button to menu
   */
  static backToMenu() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Back to Dashboard', 'btn_main_menu')]
    ]);
  }
}
