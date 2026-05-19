-- Chronicles of China's Stock Market — Database Schema
-- Designed for SQLite with PostgreSQL portability in mind.
-- All timestamps stored as ISO-8601 TEXT for cross-DB compatibility.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- Table: events — Major market events
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
    id              TEXT PRIMARY KEY,
    date            DATE NOT NULL,
    title_zh        TEXT NOT NULL,
    title_en        TEXT NOT NULL DEFAULT '',
    category        TEXT NOT NULL CHECK (category IN (
                        'milestone', 'bull', 'bear', 'crash',
                        'regulation', 'reform', 'scandal', 'ipo'
                    )),
    description_zh  TEXT NOT NULL DEFAULT '',
    description_en  TEXT NOT NULL DEFAULT '',
    sh_close        REAL,
    sz_close        REAL,
    csi300_close    REAL,
    change_pct      REAL,
    tags            TEXT NOT NULL DEFAULT '[]',   -- JSON array stored as string
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_date      ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_category  ON events(category);

-- ============================================================
-- Table: market_cycles — Bull/bear market cycles
-- ============================================================
CREATE TABLE IF NOT EXISTS market_cycles (
    id              TEXT PRIMARY KEY,
    name_zh         TEXT NOT NULL,
    name_en         TEXT NOT NULL DEFAULT '',
    type            TEXT NOT NULL CHECK (type IN ('bull', 'bear')),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    start_value     REAL NOT NULL,
    end_value       REAL NOT NULL,
    peak_value      REAL,
    peak_date       DATE,
    trough_value    REAL,
    trough_date     DATE,
    narrative_zh    TEXT NOT NULL DEFAULT '',
    narrative_en    TEXT NOT NULL DEFAULT '',
    key_events      TEXT NOT NULL DEFAULT '[]',
    duration_months INTEGER,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cycles_start_date ON market_cycles(start_date);

-- ============================================================
-- Table: daily_index — OHLCV data per trading day
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_index (
    date        DATE NOT NULL,
    index_code  TEXT NOT NULL,
    open        REAL,
    high        REAL,
    low         REAL,
    close       REAL NOT NULL,
    volume      REAL,
    change_pct  REAL,
    PRIMARY KEY (date, index_code)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_daily_index_code ON daily_index(index_code);

-- ============================================================
-- Table: index_info — Metadata for tracked indices
-- ============================================================
CREATE TABLE IF NOT EXISTS index_info (
    code        TEXT PRIMARY KEY,
    name_zh     TEXT NOT NULL,
    name_en     TEXT NOT NULL DEFAULT '',
    exchange    TEXT NOT NULL DEFAULT ''   -- 'sh', 'sz', 'csi'
);

INSERT OR IGNORE INTO index_info (code, name_zh, name_en, exchange) VALUES
    ('000001', '上证综指', 'Shanghai Composite',         'sh'),
    ('399001', '深证成指', 'Shenzhen Component',         'sz'),
    ('399006', '创业板指', 'ChiNext',                    'sz'),
    ('000300', '沪深300',  'CSI 300',                    'csi'),
    ('000016', '上证50',   'SSE 50',                     'sh'),
    ('000688', '科创50',   'STAR 50',                    'sh'),
    ('000905', '中证500',  'CSI 500',                    'csi');

-- ============================================================
-- Table: users — User accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    email               TEXT UNIQUE NOT NULL,
    password_hash       TEXT NOT NULL,
    display_name        TEXT NOT NULL DEFAULT '',
    wechat_openid       TEXT UNIQUE,
    subscription_tier   TEXT NOT NULL DEFAULT 'free'
                        CHECK (subscription_tier IN ('free', 'basic', 'pro')),
    subscription_expires DATE,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Table: favorites — User saved events
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id    TEXT    NOT NULL REFERENCES events(id)  ON DELETE CASCADE,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
