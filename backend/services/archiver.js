const fs = require('fs');
const path = require('path');

const ARCHIVE_DIR = path.join(__dirname, '..', '..', 'reports');

function extractMeta(markdown) {
  const meta = {};

  // Stock name — first # heading
  const h1 = markdown.match(/^#\s+(.+)$/m);
  if (h1) meta.stock = h1[1].replace(/[（(]\d+[）)]/, '').trim();

  // Chokepoint level
  const bp = markdown.match(/瓶颈[等级强度].*?(Hard|Medium|Soft)/i);
  if (bp) meta.chokepoint = bp[1];

  // Six-factor scores
  const raw = markdown.match(/Raw[:\s]*(\d{1,2})/i);
  const adj = markdown.match(/Adj[:\s]*(\d{1,2})/i);
  if (raw) meta.rawScore = parseInt(raw[1]);
  if (adj) meta.adjScore = parseInt(adj[1]);

  // Cross-validation
  const cv = markdown.match(/交叉验证.*?(COHERENT|INCOHERENT|一致|不一致)/i);
  if (cv) meta.crossValidation = cv[1];

  // Red-Blue
  const surv = markdown.match(/Survivability[:\s]*(\d{1,2})\s*\/\s*10/i);
  if (surv) meta.survivability = parseInt(surv[1]);
  const conf = markdown.match(/Confidence[:\s]*=?\s*(\d{1,3})/i);
  if (conf) meta.confidence = parseInt(conf[1]);

  // Position sizing
  const pos = markdown.match(/(?:建议仓位|最终仓位|仓位)[：:\s]*(\d{1,3})\s*%/);
  if (pos) meta.positionPct = parseInt(pos[1]);

  // R7 quality
  const r7 = markdown.match(/Quality[:\s]*(\d{1,2})\s*\/?\s*10/i);
  if (r7) meta.r7Quality = parseInt(r7[1]);

  // Market type (v2.9.1)
  const mkt = markdown.match(/市场[：:\s]*\[?(A股|港股|美股|A\+H)\]?/);
  if (mkt) meta.market = mkt[1];

  // Confidence tier (v2.9.1)
  const confTier = markdown.match(/Confidence[：:\s]*(\d{1,2})\s*\(?Tier:\s*(FULL|STANDARD|CAUTIOUS|DEGRADED)/i);
  if (confTier) { meta.confidence = parseInt(confTier[1]); meta.confidenceTier = confTier[2]; }

  // Market structure risk (v2.8)
  const risk = markdown.match(/市场结构风险[：:\s]*\[?([^\]]+)\]?/);
  if (risk) meta.marketRisk = risk[1].trim();

  // Stage 2.6 verification result
  const v26 = markdown.match(/✅ Stage 2\.6.*?完成/);
  meta.stage26Passed = !!v26;

  // Final conclusion — first 300 chars after last ## heading
  const conclusionSection = markdown.match(/最终(?:投资)?结论[\s\S]+$/);
  if (conclusionSection) {
    meta.conclusion = conclusionSection[0].replace(/#+\s*.*\n/g, '').trim().slice(0, 300);
  }

  return meta;
}

function archive(jobId, stock, markdown) {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }

  // Save full markdown
  const mdPath = path.join(ARCHIVE_DIR, `${jobId}.md`);
  fs.writeFileSync(mdPath, markdown, 'utf-8');

  // Extract metadata and append to JSONL log
  const meta = extractMeta(markdown);
  const logEntry = {
    jobId,
    stock,
    date: new Date().toISOString(),
    ...meta,
    markdownPath: mdPath,
  };

  const logPath = path.join(ARCHIVE_DIR, 'analysis_log.jsonl');
  fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n', 'utf-8');

  return logEntry;
}

function getArchiveList(limit = 50) {
  const logPath = path.join(ARCHIVE_DIR, 'analysis_log.jsonl');
  if (!fs.existsSync(logPath)) return [];

  const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n');
  return lines
    .filter(Boolean)
    .map(l => {
      try { return JSON.parse(l); } catch (_) { return null; }
    })
    .filter(Boolean)
    .reverse()
    .slice(0, limit);
}

// Normalize stock name for fuzzy matching: lowercase, remove spaces/parens/codes
function normalizeStock(s) {
  return (s || '').toLowerCase()
    .replace(/[（(]\d{5,6}[）)]/g, '')  // remove stock codes like (300319)
    .replace(/[^a-z一-鿿]/g, '') // keep only letters and Chinese
    .trim();
}

// Check if a report for the same stock was already done today.
// Returns { jobId, date, stock, ... } or null.
function findTodayByStock(stock) {
  const logPath = path.join(ARCHIVE_DIR, 'analysis_log.jsonl');
  if (!fs.existsSync(logPath)) return null;

  const needle = normalizeStock(stock);
  if (!needle) return null;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i]) continue;
    try {
      const entry = JSON.parse(lines[i]);
      if (!entry.date || !entry.stock) continue;
      const entryDate = entry.date.slice(0, 10);
      if (entryDate !== today) continue;
      if (normalizeStock(entry.stock) === needle) return entry;
    } catch (_) { /* skip malformed lines */ }
  }
  return null;
}

function getArchiveMarkdown(jobId) {
  const mdPath = path.join(ARCHIVE_DIR, `${jobId}.md`);
  if (!fs.existsSync(mdPath)) return null;
  return fs.readFileSync(mdPath, 'utf-8');
}

module.exports = { archive, getArchiveList, getArchiveMarkdown, findTodayByStock };
