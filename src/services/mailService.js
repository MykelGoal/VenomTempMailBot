import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config.js';

export class MailService {
  constructor() {
    this.apiBase = config.mailApiBase;
    this.backupApiBase = config.backupMailApiBase;
    this.domainsCache = [];
    this.lastDomainsFetch = 0;
  }

  async getAxios(baseUrl = this.apiBase) {
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
   * Fetches active domains with caching and fallback.
   */
  async getDomains() {
    const now = Date.now();
    if (this.domainsCache.length > 0 && (now - this.lastDomainsFetch < 300000)) { // 5 min cache
      return this.domainsCache;
    }

    try {
      const client = await this.getAxios(this.apiBase);
      const res = await client.get('/domains');
      const domains = (res.data['hydra:member'] || []).filter(d => d.isActive).map(d => d.domain);
      if (domains.length > 0) {
        this.domainsCache = domains;
        this.lastDomainsFetch = now;
        return domains;
      }
    } catch (err) {
      console.warn(`[MailService] Primary API failed (${err.message}), trying backup API...`);
    }

    try {
      const backupClient = await this.getAxios(this.backupApiBase);
      const res = await backupClient.get('/domains');
      const domains = (res.data['hydra:member'] || []).filter(d => d.isActive).map(d => d.domain);
      if (domains.length > 0) {
        this.domainsCache = domains;
        this.lastDomainsFetch = now;
        return domains;
      }
    } catch (err) {
      console.error('[MailService] Backup API also failed:', err.message);
    }

    return this.domainsCache.length > 0 ? this.domainsCache : ['emalupe.com', 'westcast-systems.com'];
  }

  /**
   * Creates a new temporary mailbox account with retry logic on username collision.
   */
  async createAccount(customUsername = null, selectedDomain = null) {
    const domains = await this.getDomains();
    const domain = selectedDomain && domains.includes(selectedDomain) ? selectedDomain : domains[0];

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
      const client = await this.getAxios();

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
          createdAt: Date.now()
        };
      } catch (err) {
        const isTaken = err.response?.status === 422 || (err.response?.data?.message && err.response.data.message.includes('used'));
        
        if (isTaken) {
          if (isCustom) {
            throw new Error(`The username "${username}" is already taken on @${domain}. Please try another name or switch domain.`);
          }
          // For random usernames, loop again to generate a new random hash
          continue;
        }

        const errMsg = err.response?.data?.message || err.message;
        throw new Error(`Account creation failed: ${errMsg}`);
      }
    }

    throw new Error('Failed to create a unique email address. Please try again.');
  }

  /**
   * Fetches incoming messages for an account.
   */
  async getMessages(token) {
    if (!token) return [];
    try {
      const client = await this.getAxios();
      const res = await client.get('/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data['hydra:member'] || [];
    } catch (err) {
      // 401 Unauthorized means token expired
      if (err.response?.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      return [];
    }
  }

  /**
   * Fetches full details of a specific message.
   */
  async getMessageDetails(token, messageId) {
    if (!token || !messageId) return null;
    try {
      const client = await this.getAxios();
      const res = await client.get(`/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    } catch (err) {
      return null;
    }
  }

  /**
   * Deletes a message by ID.
   */
  async deleteMessage(token, messageId) {
    if (!token || !messageId) return false;
    try {
      const client = await this.getAxios();
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
  async deleteAccount(token, accountId) {
    if (!token || !accountId) return false;
    try {
      const client = await this.getAxios();
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
