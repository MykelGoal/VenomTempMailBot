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
        Markup.button.callback('✏️ Custom Email', 'btn_custom_prompt')
      ]);
    } else {
      buttons.push([
        Markup.button.callback('📬 Refresh Inbox', 'btn_refresh_inbox'),
        Markup.button.callback('⚡ New Email', 'btn_generate_random')
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
      Markup.button.callback('📊 Stats', 'btn_stats'),
      Markup.button.callback('❓ How It Works', 'btn_help')
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Action buttons for active email card
   */
  static emailActiveCard(address) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📬 Refresh Inbox', 'btn_refresh_inbox'),
        Markup.button.callback('⚡ Generate New', 'btn_generate_random')
      ],
      [
        Markup.button.callback('✏️ Custom Prefix', 'btn_custom_prompt'),
        Markup.button.callback('🌐 Change Domain', 'btn_list_domains')
      ],
      [
        Markup.button.callback('🗑️ Delete Address', 'btn_delete_current'),
        Markup.button.callback('📜 All Inboxes', 'btn_my_accounts')
      ]
    ]);
  }

  /**
   * Action buttons for an incoming email / OTP notification
   */
  static emailActions(parsed) {
    const rows = [];

    // If there is a verification link, add an external URL button
    if (parsed.verifyLink) {
      rows.push([
        Markup.button.url('🔗 1-Tap Verify Link', parsed.verifyLink)
      ]);
    }

    rows.push([
      Markup.button.callback('📄 View Full Email', `btn_view_msg_${parsed.id}`),
      Markup.button.callback('🗑️ Delete', `btn_del_msg_${parsed.id}`)
    ]);

    rows.push([
      Markup.button.callback('📬 Back to Inbox', 'btn_refresh_inbox')
    ]);

    return Markup.inlineKeyboard(rows);
  }

  /**
   * Domain selection keyboard
   */
  static domainList(domains = []) {
    const rows = domains.map(d => [
      Markup.button.callback(`@${d}`, `btn_set_domain_${d}`)
    ]);
    rows.push([Markup.button.callback('⬅️ Back to Menu', 'btn_main_menu')]);
    return Markup.inlineKeyboard(rows);
  }

  /**
   * User accounts list keyboard for switching
   */
  static accountsList(accounts = [], activeEmail = '') {
    const rows = accounts.map(acc => {
      const isCurrent = acc.address === activeEmail;
      const label = `${isCurrent ? '✅ ' : ''}${acc.address}`;
      return [Markup.button.callback(label, `btn_switch_${acc.address}`)];
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
