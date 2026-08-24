import fs from 'fs';
import path from 'path';

class Database {
  constructor(filePath = './data/database.json') {
    this.filePath = filePath;
    this.data = {
      users: {},       // userId -> { id, username, isVerified, activeEmail, accounts: [], createdAt, lastSeen }
      messagesSeen: {}, // messageId -> timestamp
      stats: {
        totalEmailsGenerated: 0,
        totalMessagesReceived: 0,
        totalOtpsExtracted: 0,
        startedAt: Date.now()
      }
    };
    this.init();
  }

  init() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.data, ...parsed };
      } else {
        this.save();
      }
    } catch (err) {
      console.error('[DB] Failed to load DB file, using memory defaults:', err.message);
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to save DB file:', err.message);
    }
  }

  getUser(userId) {
    const id = String(userId);
    return this.data.users[id] || null;
  }

  getOrCreateUser(userId, username = '') {
    const id = String(userId);
    if (!this.data.users[id]) {
      this.data.users[id] = {
        id,
        username,
        isVerified: false,
        activeEmail: null,
        accounts: [],
        createdAt: Date.now(),
        lastSeen: Date.now()
      };
      this.save();
    } else {
      this.data.users[id].lastSeen = Date.now();
      if (username) this.data.users[id].username = username;
    }
    return this.data.users[id];
  }

  isUserVerified(userId) {
    const user = this.getUser(userId);
    return Boolean(user && user.isVerified);
  }

  verifyUser(userId) {
    const user = this.getOrCreateUser(userId);
    user.isVerified = true;
    this.save();
    return user;
  }

  saveAccount(userId, accountData) {
    const user = this.getOrCreateUser(userId);
    user.accounts = user.accounts.filter(a => a.address !== accountData.address);
    user.accounts.unshift(accountData);
    user.activeEmail = accountData.address;
    this.data.stats.totalEmailsGenerated++;
    this.save();
    return user;
  }

  getActiveAccount(userId) {
    const user = this.getUser(userId);
    if (!user || !user.activeEmail) return null;
    return user.accounts.find(a => a.address === user.activeEmail) || null;
  }

  deleteAccount(userId, emailAddress) {
    const user = this.getUser(userId);
    if (!user) return false;
    user.accounts = user.accounts.filter(a => a.address !== emailAddress);
    if (user.activeEmail === emailAddress) {
      user.activeEmail = user.accounts.length > 0 ? user.accounts[0].address : null;
    }
    this.save();
    return true;
  }

  setActiveEmail(userId, emailAddress) {
    const user = this.getUser(userId);
    if (!user) return false;
    const exists = user.accounts.some(a => a.address === emailAddress);
    if (exists) {
      user.activeEmail = emailAddress;
      this.save();
      return true;
    }
    return false;
  }

  getAllActiveAccounts() {
    const activeList = [];
    for (const [userId, user] of Object.entries(this.data.users)) {
      if (user.activeEmail) {
        const acc = user.accounts.find(a => a.address === user.activeEmail);
        if (acc && acc.token) {
          activeList.push({ userId, ...acc });
        }
      }
    }
    return activeList;
  }

  isMessageSeen(messageId) {
    return Boolean(this.data.messagesSeen[messageId]);
  }

  markMessageSeen(messageId) {
    this.data.messagesSeen[messageId] = Date.now();
    this.data.stats.totalMessagesReceived++;
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    for (const [id, ts] of Object.entries(this.data.messagesSeen)) {
      if (ts < cutoff) delete this.data.messagesSeen[id];
    }
    this.save();
  }

  incrementOtpCount() {
    this.data.stats.totalOtpsExtracted++;
    this.save();
  }

  getStats() {
    const totalUsers = Object.keys(this.data.users).length;
    return {
      totalUsers,
      ...this.data.stats,
      uptimeSeconds: Math.floor((Date.now() - this.data.stats.startedAt) / 1000)
    };
  }
}

export const db = new Database('./data/database.json');
