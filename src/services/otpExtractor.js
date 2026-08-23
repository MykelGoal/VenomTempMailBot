import { convert } from 'html-to-text';

export class OtpExtractor {
  /**
   * Cleans HTML into formatted readable text.
   */
  static cleanHtml(html) {
    if (!html) return '';
    try {
      return convert(html, {
        wordwrap: 130,
        selectors: [
          { selector: 'a', options: { ignoreHref: false } },
          { selector: 'img', format: 'skip' }
        ]
      });
    } catch {
      return html.replace(/<[^>]*>/g, ' ');
    }
  }

  /**
   * Extracts OTP codes from subject and email text using contextual heuristics.
   */
  static extractOtp(subject = '', text = '') {
    const combined = `${subject}\n${text}`;

    // 1. Contextual regexes (Highest accuracy)
    const contextPatterns = [
      /(?:verification|security|confirmation|login|auth|otp|one-time|pin|access|validation)\s*(?:code|pin|password|number|key)?\s*(?:is|:|-|\s)?\s*([0-9]{4,8})/i,
      /(?:code|pin)\s*(?:is|:|-|\s)\s*([0-9]{4,8})/i,
      /(?:use|enter)\s*(?:the)?\s*(?:code|pin)?\s*([0-9]{4,8})\s*(?:to|as|for)/i,
      /([0-9]{3,4}[-\s][0-9]{3,4})/, // formatted like 123-456 or 123 456
      /(?:G-|FB-|TW-|TG-)([0-9]{4,8})/i
    ];

    for (const pattern of contextPatterns) {
      const match = combined.match(pattern);
      if (match && match[1]) {
        const cleaned = match[1].replace(/[-\s]/g, '');
        if (cleaned.length >= 4 && cleaned.length <= 8) {
          return cleaned;
        }
      }
    }

    // 2. Check subject specifically for isolated digits
    const subjectMatch = subject.match(/\b([0-9]{4,8})\b/);
    if (subjectMatch && subjectMatch[1]) {
      return subjectMatch[1];
    }

    // 3. Fallback: Search for standalone 4 to 8 digit numbers
    const standaloneMatch = text.match(/\b([0-9]{4,8})\b/);
    if (standaloneMatch && standaloneMatch[1]) {
      const num = standaloneMatch[1];
      if (num.length === 4 && (num.startsWith('19') || num.startsWith('20'))) {
        // Skip year
      } else {
        return num;
      }
    }

    return null;
  }

  /**
   * Extracts the main verification or confirmation link from the email.
   */
  static extractVerificationLink(html = '', text = '') {
    const content = `${html} ${text}`;
    const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
    const links = content.match(urlRegex) || [];

    const verifyKeywords = [
      'verify', 'confirm', 'activate', 'validation', 'magic', 'token',
      'auth', 'login', 'signup', 'register', 'click-here', 'email-verification'
    ];

    for (const link of links) {
      const cleanLink = link.replace(/[.,;)]+$/, '');
      const lower = cleanLink.toLowerCase();
      if (verifyKeywords.some(kw => lower.includes(kw)) && !lower.includes('unsubscribe') && !lower.includes('privacy')) {
        return cleanLink;
      }
    }

    return null;
  }

  /**
   * Adapts & parses emails from Mail.tm, Mail.gw, or GuerrillaMail formats.
   */
  static parseEmail(message) {
    // Normalizes fields across providers
    const sender = message.from 
      ? (message.from.name ? `${message.from.name} <${message.from.address}>` : message.from.address) 
      : (message.mail_from || 'Unknown Sender');

    const subject = message.subject || message.mail_subject || '(No Subject)';
    const html = message.html || message.mail_body || '';
    const rawText = message.text || this.cleanHtml(html) || message.mail_excerpt || message.intro || '';

    const otp = this.extractOtp(subject, rawText);
    const verifyLink = this.extractVerificationLink(html, rawText);
    const preview = rawText.replace(/\s+/g, ' ').trim().slice(0, 250);

    return {
      id: String(message.id || message.mail_id),
      sender,
      subject,
      otp,
      verifyLink,
      preview,
      fullText: rawText,
      createdAt: message.createdAt || message.mail_date || new Date().toISOString(),
      hasAttachments: Boolean(message.hasAttachments || message.att)
    };
  }
}
