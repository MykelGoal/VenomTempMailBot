export class Messages {
  static escapeHtml(str = '') {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  static getTimeString() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  /**
   * Main Dashboard Welcome Card
   */
  static welcome(user, activeEmail = null) {
    const name = this.escapeHtml(user?.first_name || 'User');
    return `
⚡ <b>VENOM TEMP MAIL</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👋 Welcome, <b>${name}</b>!

${activeEmail ? `📬 <b>Active Disposable Inbox:</b>\n👉 <code>${this.escapeHtml(activeEmail)}</code> 👈\n<i>(Tap above to copy to clipboard)</i>` : '📭 <i>You do not have an active mailbox yet. Click below to create one instantly!</i>'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ <b>Core Features:</b>
• ⚡ <b>1-Click Provisioning:</b> Instant disposable inbox.
• 🔑 <b>Smart OTP Extractor:</b> 1-tap copy verification codes.
• 🔗 <b>1-Tap Verify Links:</b> Direct access buttons to activation URLs.
• 🛡️ <b>100% Privacy:</b> Zero spam, zero logs, zero ads.
• 🟢 <b>Real-Time Watchdog:</b> Instant push notifications.
`.trim();
  }

  /**
   * New Email Address Created Card
   */
  static emailCreated(address) {
    const safeAddress = this.escapeHtml(address);
    return `
⚡ <b>VENOM DISPOSABLE INBOX</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
📬 <b>YOUR ADDRESS:</b>

👉 <code>${safeAddress}</code> 👈

<i>(Tap the address above to copy to clipboard)</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 <b>Status:</b> <code>Active &amp; Watching 24/7</code>
🛡️ <b>Privacy:</b> <code>100% Anonymous</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 <i>Paste this email into Netflix, Discord, Canva, Twitter, or AI tools. Your OTP and confirmation buttons will appear here automatically within seconds!</i>
`.trim();
  }

  /**
   * Incoming Email Notification Card (Clean Security UI)
   */
  static newEmailNotification(address, parsed) {
    const safeAddress = this.escapeHtml(address);
    const safeSender = this.escapeHtml(parsed.sender);
    const safeSubject = this.escapeHtml(parsed.subject || '(No Subject)');
    const time = this.getTimeString();

    let card = '';

    // CASE 1: Email with Extracted OTP Code
    if (parsed.otp) {
      card += `⚡ <b>VENOM • VERIFICATION CODE</b>\n`;
      card += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      card += `🔑 <b>YOUR CODE (Tap to Copy):</b>\n\n`;
      card += `👉 <code>${this.escapeHtml(parsed.otp)}</code> 👈\n\n`;
      card += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      card += `👤 <b>From:</b> <code>${safeSender}</code>\n`;
      card += `📝 <b>Subject:</b> <b>${safeSubject}</b>\n`;
      card += `⏱️ <b>Time:</b> <i>${time}</i>\n`;

      if (parsed.verifyLink) {
        card += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        card += `🔗 <i>Confirmation link also detected below!</i>\n`;
      }
    } 
    // CASE 2: Email with Action Link / Confirmation Button (No OTP)
    else if (parsed.verifyLink) {
      card += `⚡ <b>VENOM • ACCOUNT ACTIVATION</b>\n`;
      card += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      card += `🔗 <b>1-TAP VERIFICATION READY</b>\n\n`;
      card += `<i>Click the button below to verify and activate your account instantly.</i>\n\n`;
      card += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      card += `👤 <b>From:</b> <code>${safeSender}</code>\n`;
      card += `📝 <b>Subject:</b> <b>${safeSubject}</b>\n`;
      card += `⏱️ <b>Time:</b> <i>${time}</i>\n`;
    } 
    // CASE 3: Standard Email
    else {
      card += `⚡ <b>VENOM • NEW MESSAGE</b>\n`;
      card += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      card += `👤 <b>From:</b> <code>${safeSender}</code>\n`;
      card += `📝 <b>Subject:</b> <b>${safeSubject}</b>\n`;
      card += `📬 <b>To:</b> <code>${safeAddress}</code>\n`;
      card += `⏱️ <b>Time:</b> <i>${time}</i>\n`;
      card += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      card += `📄 <b>Snippet:</b>\n<i>${this.escapeHtml(parsed.preview)}</i>\n`;
    }

    return card.trim();
  }

  /**
   * Full Email Content View
   */
  static fullEmailView(parsed) {
    const safeSender = this.escapeHtml(parsed.sender);
    const safeSubject = this.escapeHtml(parsed.subject || '(No Subject)');
    const safeDate = this.escapeHtml(new Date(parsed.createdAt).toLocaleString());

    let text = `📄 <b>EMAIL DETAILS</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 <b>From:</b> <code>${safeSender}</code>\n`;
    text += `📝 <b>Subject:</b> <b>${safeSubject}</b>\n`;
    text += `📅 <b>Date:</b> <i>${safeDate}</i>\n`;

    if (parsed.otp) {
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🔑 <b>OTP:</b> <code>${this.escapeHtml(parsed.otp)}</code>\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let body = parsed.fullText || '(Empty message body)';
    if (body.length > 2500) {
      body = body.slice(0, 2500) + '\n\n... [Content truncated for length]';
    }

    text += this.escapeHtml(body);
    return text.trim();
  }

  /**
   * Empty Inbox Card
   */
  static inboxEmpty(address) {
    const time = this.getTimeString();
    const safeAddress = this.escapeHtml(address);
    return `
📬 <b>ACTIVE INBOX STATUS</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
<code>${safeAddress}</code>

📭 <b>Inbox is empty.</b>
No emails received yet. The real-time watchdog is listening!

⏱️ <i>Checked: ${time}</i>
`.trim();
  }

  /**
   * Inbox List with Message Count
   */
  static inboxList(address, count) {
    const time = this.getTimeString();
    const safeAddress = this.escapeHtml(address);
    return `
📬 <b>INBOX (${count} Message${count > 1 ? 's' : ''})</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
<code>${safeAddress}</code>

<i>Select an email below to view details:</i>

⏱️ <i>Refreshed: ${time}</i>
`.trim();
  }

  /**
   * Bot Stats Card
   */
  static stats(stats) {
    const hours = Math.floor(stats.uptimeSeconds / 3600);
    const mins = Math.floor((stats.uptimeSeconds % 3600) / 60);

    return `
📊 <b>VENOM TEMP MAIL • NETWORK STATS</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 <b>Total Users:</b> <code>${stats.totalUsers}</code>
⚡ <b>Inboxes Created:</b> <code>${stats.totalEmailsGenerated}</code>
📩 <b>Emails Processed:</b> <code>${stats.totalMessagesReceived}</code>
🔑 <b>OTPs Delivered:</b> <code>${stats.totalOtpsExtracted}</code>
⏱️ <b>System Uptime:</b> <code>${hours}h ${mins}m</code>
🌐 <b>Active Networks:</b> <code>6 Gateways Online</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ <i>Engineered by MR VENOM (@MykelGoal)</i>
`.trim();
  }

  /**
   * Help & Usage Guide Card
   */
  static help() {
    return `
❓ <b>HOW TO USE VENOM TEMP MAIL</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ <b>Get a Disposable Address:</b>
Tap <b>⚡ Generate Email</b> or send <code>/new</code>.

2️⃣ <b>Paste & Request OTP:</b>
Tap the generated address to copy it, then paste it into any website (Twitter, Netflix, Discord, OpenAI, Canva, TikTok, etc.).

3️⃣ <b>Instant 1-Tap Copy:</b>
The moment the verification email is sent, the bot delivers your <b>OTP code</b> and <b>verification button</b> right here.

<b>Commands:</b>
• <code>/start</code> — Open Dashboard
• <code>/new</code> — Generate a new email
• <code>/custom &lt;name&gt;</code> — Set custom prefix
• <code>/inbox</code> — Refresh active inbox
• <code>/ping</code> — Check server ping & uptime
• <code>/delete</code> — Wipe current inbox
• <code>/stats</code> — View live stats
━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
  }

  /**
   * Custom Username Instructions Card
   */
  static customPrompt() {
    return `
✏️ <b>CREATE A CUSTOM EMAIL ADDRESS</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
Send your desired username with the command:
<code>/custom yourname</code>

<b>Example:</b>
<code>/custom venom_vip</code>
<i>(Will generate: venom_vip@sharklasers.com)</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
  }
}
