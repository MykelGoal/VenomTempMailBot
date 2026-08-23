import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config.js';

export class MailService {
  constructor() {
    this.primaryApi = config.mailApiBase; // https://api.mail.tm
    this.backupApi = config.backupMailApiBase; // https://api.mail.gw
    this.domainsMap = {}; // domain -> apiBase
    this.lastDomainsFetch = 0;
  }

  async getAxios(baseUrl = this.primaryApi) {
    return axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VenomTempMail/1.0)',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Fetches active domains from all available providers.
   */
  async getDomains() {
    const now = Date.now();
    if (Object.keys(this.domainsMap).length > 0 && (now - this.lastDomainsFetch < 300000)) {
      return Object.keys(this.domainsMap);
    }

    const providers = [this.primaryApi, this.backupApi];
    const newMap = {};

    for (const api of providers) {
      try {
        const client = await this.getAxios(api);
        const res = await client.get('/domains');
        const list = res.data['hydra:member'] || [];
        for (const d of list) {
          if (d.isActive) {
            newMap[d.domain] = api;
          }
        }
      } catch (err) {
        console.warn(`[MailService] Could not fetch domains from ${api}:`, err.message);
      }
    }

    // Fallbacks if network fails
    if (Object.keys(newMap).length === 0) {
      newMap['emalupe.com'] = this.primaryApi;
      newMap['westcast-systems.com'] = this.backupApi;
    }

    this.domainsMap = newMap;
    this.lastDomainsFetch = now;
    return Object.keys(this.domainsMap);
  }

  /**
   * Creates a new temporary mailbox account.
   */
  async createAccount(customUsername = null, selectedDomain = null) {
    const domains = await this.getDomains();
    const domain = selectedDomain && domains.includes(selectedDomain) ? selectedDomain : domains[0];
    const apiBase = this.domainsMap[domain] || (domain.includes('westcast') ? this.backupApi : this.primaryApi);

    const isCustom = Boolean(customUsername);
    let attempts = 0;
    const maxAttempts = isCustom ? 1 : 3;

    while (attempts < maxAttempts) {
      attempts++;
      const username = isCustom 
        ? customUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30)
        : 'venom_' + crypto.randomBytes(4).toString('hex');

      if (!username) {
        throw new Error('Invalid username. Please use letters, numbers, dots, or underscores.');
      }

      const address = `${username}@${domain}`;
      const password = 'Vn_' + crypto.randomBytes(8).toString('hex') + '!';
      const client = await this.getAxios(apiBase);

      try {
        // 1. Create account
        const createRes = await client.post('/accounts', { address, password });
        const accountId = createRes.data.id;

        // 2. Obtain Token
        const tokenRes = await client.post('/token', { address, password });
        const token = tokenRes.data.token;

        return {
          id: accountId,
          address,
          password,
          token,
          domain,
          apiBase,
          createdAt: Date.now()
        };
      } catch (err) {
        const isTaken = err.response?.status === 422 || (err.response?.data?.message && err.response.data.message.includes('used'));
        
        if (isTaken) {
          if (isCustom) {
            throw new Error(`The username "${username}" is already taken on @${domain}. Please choose another name or switch domain.`);
          }
          continue;
        }

        const errMsg = err.response?.data?.message || err.message;
        throw new Error(`Account creation failed on @${domain}: ${errMsg}`);
      }
    }

    throw new Error('Failed to create a unique email address. Please try again.');
  }

  /**
   * Fetches incoming messages for an account.
   */
  async getMessages(token, apiBase = null) {
    if (!token) return [];
    const base = apiBase || this.primaryApi;
    try {
      const client = await this.getAxios(base);
      const res = await client.get('/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data['hydra:member'] || [];
    } catch (err) {
      if (err.response?.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      console.error(`[MailService] Error fetching messages from ${base}:`, err.message);
      return [];
    }
  }

  /**
   * Fetches full details of a specific message.
   */
  async getMessageDetails(token, messageId, apiBase = null) {
    if (!token || !messageId) return null;
    const base = apiBase || this.primaryApi;
    try {
      const client = await this.getAxios(base);
      const res = await client.get(`/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    } catch (err) {
      console.error(`[MailService] Error fetching message ${messageId} from ${base}:`, err.message);
      return null;
    }
  }

  /**
   * Deletes a message by ID.
   */
  async deleteMessage(token, messageId, apiBase = null) {
    if (!token || !messageId) return false;
    const base = apiBase || this.primaryApi;
    try {
      const client = await this.getAxios(base);
      await client.delete(`/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deletes an entire account.
   */
  async deleteAccount(token, accountId, apiBase = null) {
    if (!token || !accountId) return false;
    const base = apiBase || this.primaryApi;
    try {
      const client = await this.getAxios(base);
      await client.delete(`/accounts/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const mailService = new MailService();
