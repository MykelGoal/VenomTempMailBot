export class Messages {
  static decodeHtml(str = '') {
    if (!str) return '';
    return String(str)
      .replace(/&#039;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ');
  }

  static escapeHtml(str = '') {
    if (!str) return '';
    const clean = this.decodeHtml(str);
    return clean
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  static cleanSender(raw = '') {
    if (!raw) return 'Unknown';
    const cleaned = this.decodeHtml(raw).replace(/"/g, '').trim();
    const match = cleaned.match(/^(.*?)\s*<([^>]+)>$/);
    if (match) {
      const name = match[1].trim();
      const email = match[2].trim();
      if (!name || name.toLowerCase() === email.toLowerCase()) {
        return this.escapeHtml(email);
      }
      return `${this.escapeHtml(name)} (<code>${this.escapeHtml(email)}</code>)`;
    }
    return this.escapeHtml(cleaned);
  }

  /**
   * Main Dashboard Welcome Card (Minimalist)
   */
  static welcome(user, activeEmail = null) {
    const name = this.escapeHtml(user?.first_name || 'User');
    return `
⚡ <b>VENOM TEMP MAIL</b>

Hey <b>${name}</b>, your instant disposable inbox is ready.

${activeEmail ? `📬 <code>${this.escapeHtml(activeEmail)}</code>\n<i>(Tap to copy)</i>` : '👉 <i>Tap below to get an email address instantly.</i>'}
`.trim();
  }

  /**
   * New Email Address Created (Minimalist)
   */
  static emailCreated(address) {
    const safeAddress = this.escapeHtml(address);
    return `
⚡ <b>VENOM DISPOSABLE EMAIL</b>

📬 <code>${safeAddress}</code>
<i>(Tap to copy)</i>

🟢 <i>Ready! Codes and links will arrive here automatically.</i>
`.trim();
  }

  /**
   * Incoming Email Notification Card (Ultra-Clean & Minimal)
   */
  static newEmailNotification(address, parsed) {
    const sender = this.cleanSender(parsed.sender);
    const subject = this.escapeHtml(parsed.subject || '(No Subject)');

    // 1. If OTP exists, show the code front-and-center
    if (parsed.otp) {
      return `
⚡ <b>VENOM OTP CODE</b>

👉 <code>${this.escapeHtml(parsed.otp)}</code> 👈

👤 ${sender}
📝 <b>${subject}</b>
`.trim();
    }

    // 2. If Verification Link exists (without OTP)
    if (parsed.verifyLink) {
      return `
⚡ <b>VENOM VERIFICATION</b>

👤 ${sender}
📝 <b>${subject}</b>

👇 <i>Click the button below to verify:</i>
`.trim();
    }

    // 3. Standard Email
    return `
⚡ <b>VENOM NEW EMAIL</b>

👤 ${sender}
📝 <b>${subject}</b>

📄 <i>${this.escapeHtml(parsed.preview)}</i>
`.trim();
  }

  /**
   * Full Email Content View (Clean)
   */
  static fullEmailView(parsed) {
    const sender = this.cleanSender(parsed.sender);
    const subject = this.escapeHtml(parsed.subject || '(No Subject)');
    const safeDate = this.escapeHtml(new Date(parsed.createdAt).toLocaleTimeString());

    let text = `📄 <b>EMAIL CONTENT</b>\n`;
    text += `👤 ${sender}\n`;
    text += `📝 <b>${subject}</b> • <i>${safeDate}</i>\n\n`;

    if (parsed.otp) {
      text += `🔑 <b>OTP:</b> <code>${this.escapeHtml(parsed.otp)}</code>\n\n`;
    }

    let body = parsed.fullText || '(Empty message)';
    if (body.length > 2500) {
      body = body.slice(0, 2500) + '\n\n... [Truncated]';
    }

    text += this.escapeHtml(body);
    return text.trim();
  }

  /**
   * Empty Inbox Card
   */
  static inboxEmpty(address) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const safeAddress = this.escapeHtml(address);
    return `
📬 <code>${safeAddress}</code>

📭 <i>Inbox is empty (${time})</i>
`.trim();
  }

  /**
   * Inbox List with Message Count
   */
  static inboxList(address, count) {
    const safeAddress = this.escapeHtml(address);
    return `
📬 <code>${safeAddress}</code>

📩 <b>${count} message${count > 1 ? 's' : ''} in inbox:</b>
`.trim();
  }

  /**
   * Bot Stats Card
   */
  static stats(stats) {
    const hours = Math.floor(stats.uptimeSeconds / 3600);
    const mins = Math.floor((stats.uptimeSeconds % 3600) / 60);

    return `
📊 <b>VENOM STATS</b>

👥 Users: <code>${stats.totalUsers}</code>
⚡ Inboxes: <code>${stats.totalEmailsGenerated}</code>
🔑 OTPs Delivered: <code>${stats.totalOtpsExtracted}</code>
⏱️ Uptime: <code>${hours}h ${mins}m</code>
`.trim();
  }

  /**
   * Help & Usage Guide
   */
  static help() {
    return `
❓ <b>HOW TO USE</b>

1. Tap <b>⚡ New Email</b> to get an address.
2. Tap the address to copy, paste into any website.
3. Your OTP code and verification buttons will appear here in 2 seconds.

<b>Commands:</b>
• <code>/start</code> — Dashboard
• <code>/new</code> — New Email
• <code>/custom &lt;name&gt;</code> — Custom Name
• <code>/inbox</code> — Refresh
• <code>/ping</code> — Server Status
`.trim();
  }

  /**
   * Custom Username Prompt
   */
  static customPrompt() {
    return `
✏️ <b>CUSTOM EMAIL</b>

Send: <code>/custom yourname</code>
Example: <code>/custom venom_vip</code>
`.trim();
  }
}
