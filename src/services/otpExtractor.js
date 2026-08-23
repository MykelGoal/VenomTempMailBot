import { convert } from 'html-to-text';

export class OtpExtractor {
  /**
   * Cleans HTML into formatted readable text while stripping boilerplate noise.
   */
  static cleanHtml(html) {
    if (!html) return '';
    try {
      let text = convert(html, {
        wordwrap: false,
        selectors: [
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'img', format: 'skip' },
          { selector: 'style', format: 'skip' },
          { selector: 'script', format: 'skip' }
        ]
      });

      // Remove common footer spam/boilerplate
      text = text
        .replace(/Thank you for using Guerrilla Mail[\s\S]*$/i, '')
        .replace(/Free to download, but you have to give[\s\S]*$/i, '')
        .replace(/Connect with us:[\s\S]*$/i, '')
        .replace(/This email was sent to[\s\S]*$/i, '')
        .replace(/You are receiving this email because[\s\S]*$/i, '')
        .replace(/Unsubscribe[\s\S]*$/i, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return text;
    } catch {
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  /**
   * Extracts OTP codes from subject and email text using contextual heuristics.
   */
  static extractOtp(subject = '', text = '') {
    const combined = `${subject}\n${text}`;

    // 1. High-accuracy contextual patterns
    const contextPatterns = [
      /(?:verification|security|confirmation|login|auth|otp|one-time|pin|access|validation)\s*(?:code|pin|password|number|key)?\s*(?:is|:|-|\s)?\s*([0-9]{4,8})/i,
      /(?:code|pin)\s*(?:is|:|-|\s)\s*([0-9]{4,8})/i,
      /(?:use|enter)\s*(?:the)?\s*(?:code|pin)?\s*([0-9]{4,8})\s*(?:to|as|for)/i,
      /([0-9]{3,4}[-\s][0-9]{3,4})/,
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

    // 2. Isolated digits in subject line
    const subjectMatch = subject.match(/\b([0-9]{4,8})\b/);
    if (subjectMatch && subjectMatch[1]) {
      return subjectMatch[1];
    }

    // 3. Fallback standalone digits (excluding common years)
    const standaloneMatch = text.match(/\b([0-9]{4,8})\b/);
    if (standaloneMatch && standaloneMatch[1]) {
      const num = standaloneMatch[1];
      if (num.length === 4 && (num.startsWith('19') || num.startsWith('20'))) {
        // likely year
      } else {
        return num;
      }
    }

    return null;
  }

  /**
   * Extracts actionable verification & confirmation links with clean button labels.
   */
  static extractActionLink(html = '', text = '') {
    const candidates = [];

    // Search HTML for <a> tags
    if (html) {
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const url = match[1].replace(/&amp;/g, '&');
        const label = match[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        candidates.push({ url, label });
      }
    }

    // Search raw text for URLs if no HTML links
    if (candidates.length === 0 && text) {
      const rawUrls = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];
      for (const url of rawUrls) {
        candidates.push({ url: url.replace(/[.,;)]+$/, ''), label: 'Open Link' });
      }
    }

    // Priority filter for verification & confirmation actions
    const priorityKeywords = [
      'verify', 'confirm', 'activate', 'validation', 'magic', 'token',
      'auth', 'login', 'signup', 'register', 'click here', 'get started', 'accept'
    ];

    const junkKeywords = [
      'unsubscribe', 'privacy', 'facebook', 'twitter', 'instagram', 'linkedin',
      'guerrillamail', 'terms', 'help', 'support', 'opt-out', 'preferences'
    ];

    for (const c of candidates) {
      const lowerUrl = c.url.toLowerCase();
      const lowerLabel = c.label.toLowerCase();

      if (junkKeywords.some(j => lowerUrl.includes(j) || lowerLabel.includes(j))) continue;

      if (priorityKeywords.some(p => lowerLabel.includes(p) || lowerUrl.includes(p))) {
        let cleanLabel = c.label || '1-Tap Verify Link';
        if (cleanLabel.length > 30) cleanLabel = '1-Tap Verify Link';
        return {
          url: c.url,
          label: cleanLabel.startsWith('🔗') ? cleanLabel : `🔗 ${cleanLabel}`
        };
      }
    }

    // Fallback: Return first valid non-junk link
    for (const c of candidates) {
      const lowerUrl = c.url.toLowerCase();
      if (!junkKeywords.some(j => lowerUrl.includes(j))) {
        return {
          url: c.url,
          label: '🔗 Open Verification Link'
        };
      }
    }

    return null;
  }

  /**
   * Adapts & parses emails into a unified, high-cleanliness structure.
   */
  static parseEmail(message) {
    const sender = message.from 
      ? (message.from.name ? `${message.from.name} <${message.from.address}>` : message.from.address) 
      : (message.mail_from || 'Unknown Sender');

    const subject = (message.subject || message.mail_subject || '(No Subject)').trim();
    const html = message.html || message.mail_body || '';
    const rawText = message.text || this.cleanHtml(html) || message.mail_excerpt || message.intro || '';

    const otp = this.extractOtp(subject, rawText);
    const actionLink = this.extractActionLink(html, rawText);

    // Clean human preview (strip extra spaces and urls from snippet)
    let preview = rawText
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (preview.length > 200) {
      preview = preview.slice(0, 200) + '...';
    }

    return {
      id: String(message.id || message.mail_id),
      sender,
      subject,
      otp,
      actionLink,
      verifyLink: actionLink ? actionLink.url : null,
      linkLabel: actionLink ? actionLink.label : '🔗 Verify Link',
      preview: preview || '(No text preview available)',
      fullText: rawText,
      createdAt: message.createdAt || message.mail_date || new Date().toISOString()
    };
  }
}
