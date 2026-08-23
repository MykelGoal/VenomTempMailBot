import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config.js';

export class MailService {
  constructor() {
    this.mailTmApi = config.mailApiBase;   // https://api.mail.tm
    this.mailGwApi = config.backupMailApiBase; // https://api.mail.gw
    this.guerrillaApi = 'https://api.guerrillamail.com/ajax.php';
    
    // Built-in domains across networks
    this.allDomains = [
      'sharklasers.com',
      'guerrillamail.com',
      'grr.la',
      'pokemail.net',
      'emalupe.com',
      'westcast-systems.com'
    ];
  }

  getProviderForDomain(domain) {
    if (domain.includes('emalupe')) return 'mailtm';
    if (domain.includes('westcast')) return 'mailgw';
    return 'guerrillamail';
  }

  async getDomains() {
    return this.allDomains;
  }

  /**
   * Creates a new temporary email account on the requested domain or GuerrillaMail default.
   */
  async createAccount(customUsername = null, selectedDomain = null) {
    const domain = selectedDomain || this.allDomains[0];
    const provider = this.getProviderForDomain(domain);

    if (provider === 'guerrillamail') {
      return await this.createGuerrillaAccount(customUsername, domain);
    } else if (provider === 'mailtm') {
      return await this.createRestAccount(customUsername, domain, this.mailTmApi);
    } else {
      return await this.createRestAccount(customUsername, domain, this.mailGwApi);
    }
  }

  /**
   * GuerrillaMail Account Generator
   */
  async createGuerrillaAccount(customUsername, domain = 'sharklasers.com') {
    try {
      const res = await axios.get(`${this.guerrillaApi}?f=get_email_address`, { timeout: 8000 });
      const sid = res.data.sid_token;
      let email = res.data.email_addr;

      // If user requested custom username
      if (customUsername) {
        const cleanUser = customUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30);
        const setRes = await axios.get(`${this.guerrillaApi}?f=set_email_user&email_user=${cleanUser}&sid_token=${sid}`, { timeout: 8000 });
        email = setRes.data.email_addr;
      }

      // Replace domain if a specific guerrilla domain was requested
      const userPrefix = email.split('@')[0];
      const finalAddress = `${userPrefix}@${domain}`;

      return {
        id: sid,
        address: finalAddress,
        userPrefix,
        provider: 'guerrillamail',
        token: sid,
        domain,
        createdAt: Date.now()
      };
    } catch (err) {
      throw new Error(`Failed to create GuerrillaMail inbox: ${err.message}`);
    }
  }

  /**
   * Mail.tm / Mail.gw Account Generator
   */
  async createRestAccount(customUsername, domain, apiBase) {
    const isCustom = Boolean(customUsername);
    let attempts = 0;
    const maxAttempts = isCustom ? 1 : 3;

    while (attempts < maxAttempts) {
      attempts++;
      const username = isCustom 
        ? customUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30)
        : 'venom_' + crypto.randomBytes(4).toString('hex');

      const address = `${username}@${domain}`;
      const password = 'Vn_' + crypto.randomBytes(8).toString('hex') + '!';

      try {
        const client = axios.create({ baseURL: apiBase, timeout: 10000 });
        const createRes = await client.post('/accounts', { address, password });
        const accountId = createRes.data.id;

        const tokenRes = await client.post('/token', { address, password });
        const token = tokenRes.data.token;

        return {
          id: accountId,
          address,
          password,
          token,
          domain,
          provider: apiBase.includes('mail.tm') ? 'mailtm' : 'mailgw',
          apiBase,
          createdAt: Date.now()
        };
      } catch (err) {
        if (err.response?.status === 422) {
          if (isCustom) throw new Error(`Username "${username}" is already taken on @${domain}.`);
          continue;
        }
        throw new Error(err.response?.data?.message || err.message);
      }
    }
    throw new Error('Could not create account, please try again.');
  }

  /**
   * Fetches messages from account regardless of provider
   */
  async getMessages(account) {
    if (!account || !account.token) return [];

    if (account.provider === 'guerrillamail') {
      try {
        const res = await axios.get(`${this.guerrillaApi}?f=check_email&seq=0&sid_token=${account.token}`, { timeout: 8000 });
        const list = res.data.list || [];
        // Map Guerrilla messages to standard shape
        return list.map(m => ({
          id: String(m.mail_id),
          from: { name: m.mail_from, address: m.mail_from },
          subject: m.mail_subject,
          intro: m.mail_excerpt,
          createdAt: m.mail_date,
          raw: m
        }));
      } catch (err) {
        console.error('[MailService] Error polling GuerrillaMail:', err.message);
        return [];
      }
    }

    // REST Providers (mail.tm / mail.gw)
    const base = account.apiBase || (account.provider === 'mailgw' ? this.mailGwApi : this.mailTmApi);
    try {
      const res = await axios.get(`${base}/messages`, {
        headers: { Authorization: `Bearer ${account.token}` },
        timeout: 8000
      });
      return res.data['hydra:member'] || [];
    } catch (err) {
      if (err.response?.status === 401) throw new Error('UNAUTHORIZED');
      return [];
    }
  }

  /**
   * Fetches full message details
   */
  async getMessageDetails(account, messageId) {
    if (!account || !messageId) return null;

    if (account.provider === 'guerrillamail') {
      try {
        const res = await axios.get(`${this.guerrillaApi}?f=fetch_email&email_id=${messageId}&sid_token=${account.token}`, { timeout: 8000 });
        const data = res.data;
        return {
          id: String(data.mail_id),
          from: { name: data.mail_from, address: data.mail_from },
          subject: data.mail_subject,
          text: data.mail_body,
          html: data.mail_body,
          createdAt: data.mail_date
        };
      } catch (err) {
        console.error('[MailService] Error fetching Guerrilla email:', err.message);
        return null;
      }
    }

    const base = account.apiBase || (account.provider === 'mailgw' ? this.mailGwApi : this.mailTmApi);
    try {
      const res = await axios.get(`${base}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${account.token}` },
        timeout: 8000
      });
      return res.data;
    } catch (err) {
      return null;
    }
  }

  /**
   * Deletes a message
   */
  async deleteMessage(account, messageId) {
    if (!account || !messageId) return false;

    if (account.provider === 'guerrillamail') {
      try {
        await axios.get(`${this.guerrillaApi}?f=del_email&email_ids[]=${messageId}&sid_token=${account.token}`, { timeout: 8000 });
        return true;
      } catch {
        return false;
      }
    }

    const base = account.apiBase || (account.provider === 'mailgw' ? this.mailGwApi : this.mailTmApi);
    try {
      await axios.delete(`${base}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${account.token}` },
        timeout: 8000
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deletes an entire account
   */
  async deleteAccount(account) {
    if (!account) return false;
    if (account.provider === 'guerrillamail') return true; // auto-expires
    const base = account.apiBase || (account.provider === 'mailgw' ? this.mailGwApi : this.mailTmApi);
    try {
      await axios.delete(`${base}/accounts/${account.id}`, {
        headers: { Authorization: `Bearer ${account.token}` },
        timeout: 8000
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const mailService = new MailService();
