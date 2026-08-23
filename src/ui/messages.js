export class Messages {
  static escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  static getTimeString() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  static welcome(user, activeEmail = null) {
    const name = this.escapeHtml(user.first_name || 'User');
    return `
⚡ <b>VENOM TEMP MAIL — Instant Disposable Inbox & OTP Extractor</b>

Hey <b>${name}</b>! Protect your real identity and bypass email verifications effortlessly.

${activeEmail ? `📬 <b>Active Email:</b>\n<code>${activeEmail}</code>\n<i>(Tap above to copy)</i>` : '👉 <i>You don’t have an active disposable inbox yet. Click below to generate one instantly!</i>'}

✨ <b>Features:</b>
• ⚡ <b>Instant Provisioning:</b> 1-click disposable email address.
• 🔑 <b>Smart OTP Extractor:</b> Auto-extracts 4–8 digit verification codes.
• 🔗 <b>1-Tap Verify Links:</b> Direct access to activation URLs.
• 🛡️ <b>Anti-Spam & Anonymous:</b> 100% private, zero logs.
• 🔄 <b>Live Watchdog:</b> Real-time push notifications.
`.trim();
  }

  static emailCreated(address) {
    return `
🎉 <b>New Disposable Email Ready!</b>

📬 <b>Address:</b>
<code>${address}</code>
<i>(Tap the address above to copy to clipboard)</i>

⏳ <b>Status:</b> 🟢 Active & Watching for incoming emails...
💡 <i>Use this address on any website. Verification codes & OTPs will appear here automatically within seconds!</i>
`.trim();
  }

  static newEmailNotification(address, parsed) {
    let text = `⚡ <b>NEW EMAIL RECEIVED</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📬 <b>To:</b> <code>${address}</code>\n`;
    text += `👤 <b>From:</b> <code>${this.escapeHtml(parsed.sender)}</code>\n`;
    text += `📝 <b>Subject:</b> <b>${this.escapeHtml(parsed.subject)}</b>\n`;

    if (parsed.otp) {
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🔑 <b>EXTRACTED OTP CODE:</b>\n`;
      text += `👉 <code>${parsed.otp}</code> 👈\n`;
      text += `<i>(Tap code above to copy instantly)</i>\n`;
    }

    if (parsed.verifyLink) {
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🔗 <b>Verification Link Detected!</b> Click the button below to confirm your account.\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📄 <b>Snippet:</b>\n<i>${this.escapeHtml(parsed.preview)}</i>\n`;

    return text.trim();
  }

  static fullEmailView(parsed) {
    let text = `📄 <b>FULL EMAIL CONTENT</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 <b>From:</b> ${this.escapeHtml(parsed.sender)}\n`;
    text += `📝 <b>Subject:</b> ${this.escapeHtml(parsed.subject)}\n`;
    text += `📅 <b>Date:</b> ${new Date(parsed.createdAt).toLocaleString()}\n`;
    if (parsed.otp) {
      text += `🔑 <b>OTP:</b> <code>${parsed.otp}</code>\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    const body = (parsed.fullText || '(Empty message)').slice(0, 3500);
    text += this.escapeHtml(body);

    return text.trim();
  }

  static inboxEmpty(address) {
    const time = this.getTimeString();
    return `
📬 <b>Active Disposable Inbox:</b>
<code>${address}</code>

📭 <b>Inbox is empty.</b>
No messages received yet. The bot is actively watching!

⏱️ <i>Last refreshed: ${time}</i>
`.trim();
  }

  static inboxList(address, count) {
    const time = this.getTimeString();
    return `
📬 <b>Inbox (${count} message${count > 1 ? 's' : ''}):</b>
<code>${address}</code>

<i>Latest emails are automatically pushed as notifications.</i>

⏱️ <i>Last refreshed: ${time}</i>
`.trim();
  }

  static stats(stats) {
    const hours = Math.floor(stats.uptimeSeconds / 3600);
    const mins = Math.floor((stats.uptimeSeconds % 3600) / 60);

    return `
📊 <b>VENOM TEMP MAIL — LIVE STATS</b>
━━━━━━━━━━━━━━━━━━━━━
👥 <b>Total Users:</b> <code>${stats.totalUsers}</code>
⚡ <b>Emails Generated:</b> <code>${stats.totalEmailsGenerated}</code>
📩 <b>Emails Processed:</b> <code>${stats.totalMessagesReceived}</code>
🔑 <b>OTPs Extracted:</b> <code>${stats.totalOtpsExtracted}</code>
⏱️ <b>Uptime:</b> <code>${hours}h ${mins}m</code>
━━━━━━━━━━━━━━━━━━━━━
🛡️ <i>Engineered by MR VENOM (@MykelGoal)</i>
`.trim();
  }

  static help() {
    return `
❓ <b>HOW TO USE VENOM TEMP MAIL</b>
━━━━━━━━━━━━━━━━━━━━━
1️⃣ <b>Generate an Email:</b>
Tap <b>⚡ Generate Email</b> or type <code>/new</code> to get a fresh disposable address.

2️⃣ <b>Copy & Paste:</b>
Tap the generated address to copy it, then paste it into any website (Twitter, Netflix, Discord, OpenAI, ChatGPT, TikTok, etc.).

3️⃣ <b>Get OTP Instantly:</b>
As soon as the verification email is sent, the bot delivers the <b>OTP code</b> and <b>verification link</b> right here.

<b>Commands:</b>
• <code>/start</code> — Open Dashboard
• <code>/new</code> — Generate a new random email
• <code>/custom &lt;name&gt;</code> — Create custom username
• <code>/inbox</code> — Refresh active inbox
• <code>/ping</code> — Check server ping & uptime
• <code>/delete</code> — Delete current email
• <code>/stats</code> — View live network stats
━━━━━━━━━━━━━━━━━━━━━
`.trim();
  }

  static customPrompt() {
    return `
✏️ <b>Create a Custom Email Prefix</b>

Send your desired username using the command:
<code>/custom yourname</code>

<b>Example:</b>
<code>/custom venom_pro</code>
<i>(Will generate: venom_pro@domain.com)</i>
`.trim();
  }
}
