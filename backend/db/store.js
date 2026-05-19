/**
 * JSON-backed data store — zero native dependencies.
 * Loads events.json, market_cycles.json, daily_index.json into memory.
 * Users and favorites are persisted to users.json in the data directory.
 */

const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// ---------------------------------------------------------------------------
// JSON file helpers
// ---------------------------------------------------------------------------

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[store] ${filePath} not found`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// In-memory data (loaded once at startup)
// ---------------------------------------------------------------------------

let events = [];
let cycles = [];
let dailyIndex = [];
let users = [];
let favorites = [];
let nextUserId = 1;
let nextFavoriteId = 1;

function loadAll() {
  const eventsData = readJSON('events.json');
  if (eventsData) events = eventsData;

  const cyclesData = readJSON('market_cycles.json');
  if (cyclesData) cycles = Array.isArray(cyclesData) ? cyclesData : (cyclesData.cycles || []);

  const dailyData = readJSON('daily_index.json');
  if (dailyData) dailyIndex = dailyData;

  // Load persisted users/favorites if they exist
  const usersData = readJSON('users.json');
  if (usersData) {
    users = usersData.users || [];
    nextUserId = usersData.nextUserId || 1;
  }

  const favData = readJSON('favorites.json');
  if (favData) {
    favorites = favData.favorites || [];
    nextFavoriteId = favData.nextFavoriteId || 1;
  }

  console.log(`[store] Loaded ${events.length} events, ${cycles.length} cycles, ${dailyIndex.length} daily rows`);
  console.log(`[store] Loaded ${users.length} users, ${favorites.length} favorites`);
}

function persistUsers() {
  writeJSON('users.json', { users, nextUserId });
}

function persistFavorites() {
  writeJSON('favorites.json', { favorites, nextFavoriteId });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function listEvents(opts = {}) {
  const page  = Math.max(1, parseInt(opts.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(opts.limit, 10) || 20));
  const offset = (page - 1) * limit;

  let filtered = [...events];

  if (opts.category) {
    filtered = filtered.filter(e => e.category === opts.category);
  }
  if (opts.start_date) {
    filtered = filtered.filter(e => e.date >= opts.start_date);
  }
  if (opts.end_date) {
    filtered = filtered.filter(e => e.date <= opts.end_date);
  }
  if (opts.search && opts.search.trim()) {
    const q = opts.search.trim().toLowerCase();
    filtered = filtered.filter(e =>
      (e.title_zh && e.title_zh.toLowerCase().includes(q)) ||
      (e.description_zh && e.description_zh.toLowerCase().includes(q))
    );
  }

  // Sort by date descending
  filtered.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 0;
  const data = filtered.slice(offset, offset + limit).map(e => ({
    ...e,
    tags: Array.isArray(e.tags) ? e.tags : [],
    sh_close: e.market_data ? e.market_data.sh_close : (e.sh_close || null),
    sz_close: e.market_data ? e.market_data.sz_close : (e.sz_close || null),
    csi300_close: e.market_data ? e.market_data.csi300_close : (e.csi300_close || null),
    change_pct: e.market_data ? e.market_data.change_pct : (e.change_pct || null),
  }));

  return { data, total, page, totalPages };
}

function getEventById(id) {
  const event = events.find(e => e.id === id);
  if (!event) return null;

  const md = event.market_data || {};
  const parsed = {
    ...event,
    tags: Array.isArray(event.tags) ? event.tags : [],
    sh_close: md.sh_close ?? event.sh_close ?? null,
    sz_close: md.sz_close ?? event.sz_close ?? null,
    csi300_close: md.csi300_close ?? event.csi300_close ?? null,
    change_pct: md.change_pct ?? event.change_pct ?? null,
  };

  // Related events: same category, or within 30 days, excluding self, limit 5
  const eventDate = new Date(event.date);
  const related = events
    .filter(e => e.id !== id)
    .map(e => {
      const diff = Math.abs(new Date(e.date) - eventDate);
      const sameCat = e.category === event.category ? 0 : 1;
      return { ...e, _diff: diff, _sameCat: sameCat };
    })
    .sort((a, b) => a._sameCat - b._sameCat || a._diff - b._diff)
    .slice(0, 5)
    .map(e => ({ id: e.id, date: e.date, title_zh: e.title_zh, category: e.category }));

  return { ...parsed, related };
}

function getTodayInHistory(month, day) {
  return events
    .filter(e => {
      const parts = e.date.split('-');
      return parseInt(parts[1]) === month && parseInt(parts[2]) === day;
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(e => ({
      ...e,
      tags: Array.isArray(e.tags) ? e.tags : [],
      sh_close: e.market_data ? e.market_data.sh_close : (e.sh_close || null),
      sz_close: e.market_data ? e.market_data.sz_close : (e.sz_close || null),
      csi300_close: e.market_data ? e.market_data.csi300_close : (e.csi300_close || null),
      change_pct: e.market_data ? e.market_data.change_pct : (e.change_pct || null),
    }));
}

// ---------------------------------------------------------------------------
// Index data
// ---------------------------------------------------------------------------

function getDaily(code, { start, end, limit } = {}) {
  let filtered = dailyIndex.filter(d => d.index_code === code);

  if (start) filtered = filtered.filter(d => d.date >= start);
  if (end)   filtered = filtered.filter(d => d.date <= end);

  filtered.sort((a, b) => a.date.localeCompare(b.date));

  const rowLimit = Math.min(2000, Math.max(1, parseInt(limit, 10) || 250));
  return filtered.slice(0, rowLimit);
}

function getLatest() {
  if (dailyIndex.length === 0) return { date: null, indices: [] };

  // Find latest date
  let latestDate = '';
  for (const d of dailyIndex) {
    if (d.date > latestDate) latestDate = d.date;
  }

  const indices = dailyIndex.filter(d => d.date === latestDate);

  const indexNames = {
    '000001': { name_zh: '上证综指', name_en: 'Shanghai Composite' },
    '399001': { name_zh: '深证成指', name_en: 'Shenzhen Component' },
    '399006': { name_zh: '创业板指', name_en: 'ChiNext' },
    '000300': { name_zh: '沪深300', name_en: 'CSI 300' },
    '000016': { name_zh: '上证50', name_en: 'SSE 50' },
    '000688': { name_zh: '科创50', name_en: 'STAR 50' },
    '000905': { name_zh: '中证500', name_en: 'CSI 500' },
  };

  return {
    date: latestDate,
    indices: indices.map(d => ({
      ...d,
      name_zh: (indexNames[d.index_code] || {}).name_zh || d.index_code,
      name_en: (indexNames[d.index_code] || {}).name_en || d.index_code,
    })),
  };
}

function getCycles() {
  return [...cycles].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

function createUser({ email, password_hash, display_name }) {
  const id = nextUserId++;
  const user = {
    id,
    email,
    password_hash,
    display_name: display_name || email.split('@')[0],
    subscription_tier: 'free',
    subscription_expires: null,
    created_at: new Date().toISOString(),
  };
  users.push(user);
  persistUsers();
  return user;
}

function findUserByEmail(email) {
  return users.find(u => u.email === email) || null;
}

function findUserById(id) {
  return users.find(u => u.id === id) || null;
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

function addFavorite(userId, eventId) {
  // Check duplicate
  if (favorites.find(f => f.user_id === userId && f.event_id === eventId)) {
    const err = new Error('Event already in favorites');
    err.status = 409;
    throw err;
  }

  const id = nextFavoriteId++;
  const fav = {
    id,
    user_id: userId,
    event_id: eventId,
    created_at: new Date().toISOString(),
  };
  favorites.push(fav);
  persistFavorites();

  // Return with event info
  const event = events.find(e => e.id === eventId);
  return {
    ...fav,
    title_zh: event ? event.title_zh : '',
    event_date: event ? event.date : '',
    category: event ? event.category : '',
  };
}

function removeFavorite(userId, eventId) {
  const idx = favorites.findIndex(f => f.user_id === userId && f.event_id === eventId);
  if (idx === -1) return false;
  favorites.splice(idx, 1);
  persistFavorites();
  return true;
}

function listFavoritesByUser(userId) {
  return favorites
    .filter(f => f.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(f => {
      const event = events.find(e => e.id === f.event_id);
      if (!event) return { ...f, event_missing: true };
      const md = event.market_data || {};
      return {
        id: f.id,
        event_id: f.event_id,
        favorited_at: f.created_at,
        date: event.date,
        title_zh: event.title_zh,
        title_en: event.title_en || '',
        category: event.category,
        sh_close: md.sh_close ?? event.sh_close ?? null,
        sz_close: md.sz_close ?? event.sz_close ?? null,
        csi300_close: md.csi300_close ?? event.csi300_close ?? null,
        change_pct: md.change_pct ?? event.change_pct ?? null,
        tags: Array.isArray(event.tags) ? event.tags : [],
      };
    });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

loadAll();

module.exports = {
  listEvents,
  getEventById,
  getTodayInHistory,
  getDaily,
  getLatest,
  getCycles,
  createUser,
  findUserByEmail,
  findUserById,
  addFavorite,
  removeFavorite,
  listFavoritesByUser,
};
