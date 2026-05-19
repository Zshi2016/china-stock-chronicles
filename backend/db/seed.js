/**
 * Seed script — reads JSON data files produced by Engineer 1 and inserts/upserts
 * them into the database. Gracefully handles missing files.
 *
 * Usage:  node db/seed.js
 *   or:   npm run seed
 *
 * Expected input files (relative to C:\Users\dudu\):
 *   data/events.json
 *   data/market_cycles.json
 *   data/daily_index.json   (optional)
 */

const path = require('path');
const fs = require('fs');

// Load .env manually so we can seed without starting the full server.
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) { /* optional */ }

const { getConnection, closeConnection } = require('./connection');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

/**
 * Safely read and parse a JSON file.
 * Returns `null` if the file does not exist or is malformed.
 */
function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[seed] Warning: ${filePath} not found — skipping.`);
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    console.log(`[seed] Read ${filename} (${Array.isArray(data) ? data.length : 1} record(s))`);
    return data;
  } catch (err) {
    console.error(`[seed] Error parsing ${filename}: ${err.message}`);
    return null;
  }
}

/**
 * Build a batch-upsert statement. For SQLite we use INSERT OR REPLACE.
 */
function upsertEvents(db, events) {
  if (!Array.isArray(events) || events.length === 0) return 0;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO events
      (id, date, title_zh, title_en, category, description_zh, description_en,
       sh_close, sz_close, csi300_close, change_pct, tags, created_at)
    VALUES
      (@id, @date, @title_zh, @title_en, @category, @description_zh, @description_en,
       @sh_close, @sz_close, @csi300_close, @change_pct, @tags, @created_at)
  `);

  const insertMany = db.transaction((rows) => {
    let count = 0;
    for (const row of rows) {
      const md = row.market_data || {};
      insert.run({
        id:             row.id,
        date:           row.date,
        title_zh:       row.title_zh || row.title || '',
        title_en:       row.title_en || '',
        category:       row.category || 'milestone',
        description_zh: row.description_zh || row.description || '',
        description_en: row.description_en || '',
        sh_close:       md.sh_close ?? row.sh_close ?? null,
        sz_close:       md.sz_close ?? row.sz_close ?? null,
        csi300_close:   md.csi300_close ?? row.csi300_close ?? null,
        change_pct:     md.change_pct ?? row.change_pct ?? null,
        tags:           Array.isArray(row.tags) ? JSON.stringify(row.tags) : (row.tags || '[]'),
        created_at:     row.created_at || new Date().toISOString(),
      });
      count++;
    }
    return count;
  });

  return insertMany(events);
}

function upsertCycles(db, cycles) {
  if (!Array.isArray(cycles) || cycles.length === 0) return 0;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO market_cycles
      (id, name_zh, name_en, type, start_date, end_date,
       start_value, end_value, peak_value, peak_date, trough_value, trough_date,
       narrative_zh, narrative_en, created_at)
    VALUES
      (@id, @name_zh, @name_en, @type, @start_date, @end_date,
       @start_value, @end_value, @peak_value, @peak_date, @trough_value, @trough_date,
       @narrative_zh, @narrative_en, @created_at)
  `);

  const insertMany = db.transaction((rows) => {
    let count = 0;
    for (const row of rows) {
      insert.run({
        id:              row.id,
        name_zh:         row.name_zh || row.name || '',
        name_en:         row.name_en || '',
        type:            row.type || 'bull',
        start_date:      row.start_date,
        end_date:        row.end_date,
        start_value:     row.start_value,
        end_value:       row.end_value,
        peak_value:      row.peak_value ?? null,
        peak_date:       row.peak_date ?? null,
        trough_value:    row.trough_value ?? null,
        trough_date:     row.trough_date ?? null,
        narrative_zh:    row.narrative_zh || row.narrative || row.description || '',
        narrative_en:    row.narrative_en || '',
        key_events:      Array.isArray(row.key_events) ? JSON.stringify(row.key_events) : (row.key_events || '[]'),
        duration_months: row.duration_months ?? null,
        created_at:      row.created_at || new Date().toISOString(),
      });
      count++;
    }
    return count;
  });

  return insertMany(cycles);
}

function upsertDailyIndex(db, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO daily_index
      (date, index_code, open, high, low, close, volume, change_pct)
    VALUES
      (@date, @index_code, @open, @high, @low, @close, @volume, @change_pct)
  `);

  const insertMany = db.transaction((records) => {
    let count = 0;
    for (const row of records) {
      insert.run({
        date:       row.date,
        index_code: row.index_code || '000001',
        open:       row.open ?? null,
        high:       row.high ?? null,
        low:        row.low ?? null,
        close:      row.close,
        volume:     row.volume ?? null,
        change_pct: row.change_pct ?? null,
      });
      count++;
    }
    return count;
  });

  return insertMany(records);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[seed] Starting database seed...');

  // Load .env if available
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

  const db = getConnection();

  // ---------- events ----------
  const events = readJSON('events.json');
  if (events) {
    const count = upsertEvents(db, events);
    console.log(`[seed] Upserted ${count} events`);
  }

  // ---------- market_cycles ----------
  const cycles = readJSON('market_cycles.json');
  if (cycles) {
    const count = upsertCycles(db, cycles);
    console.log(`[seed] Upserted ${count} market cycles`);
  }

  // ---------- daily_index (optional) ----------
  const daily = readJSON('daily_index.json');
  if (daily) {
    const count = upsertDailyIndex(db, daily);
    console.log(`[seed] Upserted ${count} daily index rows`);
  }

  console.log('[seed] Done.');
  closeConnection();
}

main();
