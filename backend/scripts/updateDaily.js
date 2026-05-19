/**
 * updateDaily.js — Cron script to fetch the latest trading day data.
 *
 * This is a placeholder that will be extended to pull from an external data
 * source (e.g. AKShare bridge, EastMoney API). For now it simply reports
 * the latest date in the database.
 *
 * Usage: node scripts/updateDaily.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getConnection, closeConnection } = require('../db/connection');

async function main() {
  console.log('[updateDaily] Checking for new trading data...');

  const db = getConnection();

  const latest = db.prepare(
    'SELECT date, index_code, close FROM daily_index WHERE date = (SELECT MAX(date) FROM daily_index) ORDER BY index_code'
  ).all();

  if (latest.length === 0) {
    console.log('[updateDaily] No data in daily_index yet. Run `npm run seed` with a daily_index.json file.');
  } else {
    console.log(`[updateDaily] Latest trading date: ${latest[0].date}`);
    for (const row of latest) {
      console.log(`  ${row.index_code}  close=${row.close}`);
    }
  }

  // TODO: fetch from external source and upsert new rows.
  // Example:
  //   const newRows = await fetchFromAKShare();
  //   upsertDailyIndex(db, newRows);

  console.log('[updateDaily] Done.');
  closeConnection();
}

main().catch((err) => {
  console.error('[updateDaily] Fatal error:', err);
  closeConnection();
  process.exit(1);
});
