/**
 * Generate SEO-friendly static HTML pages for each event.
 * Output: demo/events/evt-xxx.html + demo/events/sitemap.xml
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);
const OUT_DIR = path.join(__dirname, '..', 'demo', 'events');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const CYCLES_FILE = path.join(DATA_DIR, 'market_cycles.json');

const BASE_URL = 'https://china-stock-chronicles.onrender.com';

const events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
const cyclesRaw = JSON.parse(fs.readFileSync(CYCLES_FILE, 'utf-8'));
const cycles = Array.isArray(cyclesRaw) ? cyclesRaw : (cyclesRaw.cycles || []);

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const CATEGORY_NAMES = {
  policy: '政策', bubble: '泡沫', crash: '崩盘', reform: '改革',
  international: '国际', scandal: '丑闻', milestone: '里程碑', other: '其他'
};

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function findCycle(dateStr) {
  return cycles.find(c => dateStr >= (c.start_date || '') && dateStr <= (c.end_date || '9999'));
}

function relatedEvents(ev, limit) {
  const evDate = new Date(ev.date);
  return events
    .filter(e => e.id !== ev.id)
    .map(e => ({ ...e, _diff: Math.abs(new Date(e.date) - evDate), _sameCat: e.category === ev.category ? 0 : 1 }))
    .sort((a, b) => a._sameCat - b._sameCat || a._diff - b._diff)
    .slice(0, limit || 5);
}

function renderEnrichedData(ev) {
  let html = '';
  if (ev.key_numbers && ev.key_numbers.length) {
    html += '<section class="enrich-section"><h2>关键数据</h2><div class="key-numbers-grid">';
    for (const kn of ev.key_numbers) {
      html += `<div class="kn-card"><div class="kn-label">${esc(kn.label)}</div><div class="kn-value">${esc(kn.value)}</div></div>`;
    }
    html += '</div></section>';
  }
  if (ev.affected_sectors && ev.affected_sectors.length) {
    html += '<section class="enrich-section"><h2>影响板块</h2><div class="sector-chips">';
    for (const s of ev.affected_sectors) {
      html += `<span class="sector-chip">${esc(s.name)}<span class="chip-impact">${esc(s.impact || '')}</span></span>`;
    }
    html += '</div></section>';
  }
  if (ev.notable_stocks && ev.notable_stocks.length) {
    html += '<section class="enrich-section"><h2>知名个股</h2><table class="stocks-table"><thead><tr><th>股票</th><th>代码</th><th>角色</th></tr></thead><tbody>';
    for (const s of ev.notable_stocks) {
      html += `<tr><td>${esc(s.name)}</td><td>${esc(s.code)}</td><td>${esc(s.role)}</td></tr>`;
    }
    html += '</tbody></table></section>';
  }
  if (ev.references && ev.references.length) {
    html += '<section class="enrich-section"><h2>原始文献</h2><ul class="ref-list">';
    for (const r of ev.references) {
      html += `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a><span class="ref-source">${esc(r.source || '')}</span></li>`;
    }
    html += '</ul></section>';
  }
  return html;
}

function buildPage(ev) {
  const cycle = findCycle(ev.date);
  const related = relatedEvents(ev);
  const md = ev.market_data || {};
  const shClose = md.sh_close ?? ev.sh_close ?? null;
  const szClose = md.sz_close ?? ev.sz_close ?? null;
  const changePct = md.change_pct ?? ev.change_pct ?? null;
  const tags = Array.isArray(ev.tags) ? ev.tags : [];
  const catName = CATEGORY_NAMES[ev.category] || ev.category;
  const desc = (ev.description_zh || ev.title_zh || '').slice(0, 160);
  const title = `${ev.title_zh || ev.title_en} — 中国股市编年史`;
  const canonical = `${BASE_URL}/events/${ev.id}.html`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: ev.title_zh || ev.title_en,
    description: desc,
    datePublished: ev.date,
    about: [{ '@type': 'Thing', name: '中国股市' }, { '@type': 'Thing', name: 'A股市场' }],
    ...(ev.references && ev.references.length ? { citation: ev.references.map(r => ({ '@type': 'CreativeWork', name: r.title, url: r.url })) } : {}),
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="中国股市编年史">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="${canonical}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
:root {
  --bg-primary: #0b0d11; --bg-card: #14171d; --bg-hover: #1b1f28;
  --border: #262a35; --text-primary: #e6e3dc; --text-secondary: #a8a59b;
  --text-tertiary: #6e6b62; --accent: #c9a350; --accent-blue: #5a9fd4;
  --green: #4daf91; --red: #e05660; --orange: #d48540; --cyan: #4db8b0;
  --radius: 8px;
  --font: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: var(--bg-primary); color: var(--text-primary); font-family: var(--font); font-size: 16px; line-height: 1.8; -webkit-font-smoothing: antialiased; }
a { color: var(--accent); text-decoration: none; } a:hover { text-decoration: underline; }
.header { position: sticky; top:0; z-index:100; background: rgba(11,13,17,0.94); border-bottom:1px solid var(--border); padding:14px 32px; display:flex; align-items:center; gap:20px; backdrop-filter:blur(20px); }
.header h1 { font-size:20px; letter-spacing:0.04em; white-space:nowrap; background:linear-gradient(135deg,var(--text-primary) 0%,#c9a350 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.header a { -webkit-text-fill-color:initial; color:inherit; text-decoration:none; }
.header-right { margin-left:auto; font-size:13px; color:var(--text-tertiary); }
.container { max-width:900px; margin:0 auto; padding:32px 24px 80px; }
.breadcrumb { font-size:13px; color:var(--text-tertiary); margin-bottom:24px; }
.breadcrumb a { color:var(--text-secondary); }
.article-header { margin-bottom:32px; }
.article-date { font-size:14px; color:var(--text-tertiary); margin-bottom:8px; font-variant-numeric:tabular-nums; }
.article-title { font-size:30px; font-weight:800; line-height:1.3; margin-bottom:8px; }
.article-meta { display:flex; gap:12px; flex-wrap:wrap; margin-top:12px; }
.badge { font-size:12px; padding:4px 12px; border-radius:12px; font-weight:600; }
.badge-cat { background:rgba(201,163,80,0.12); color:var(--accent); border:1px solid rgba(201,163,80,0.25); }
.badge-tag { background:var(--bg-card); color:var(--text-secondary); border:1px solid var(--border); }
.badge-cycle { font-size:12px; padding:4px 12px; border-radius:12px; font-weight:600; }
.market-bar { display:flex; gap:24px; padding:16px 20px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); margin-bottom:28px; flex-wrap:wrap; }
.market-item { display:flex; flex-direction:column; }
.market-label { font-size:11px; color:var(--text-tertiary); letter-spacing:0.04em; }
.market-value { font-size:20px; font-weight:700; font-variant-numeric:tabular-nums; }
.market-value.up { color:var(--green); }
.market-value.down { color:var(--red); }
.market-value.index { color:var(--accent); }
.article-body { font-size:17px; line-height:1.9; margin-bottom:32px; white-space:pre-line; }
.enrich-section { margin-bottom:28px; }
.enrich-section h2 { font-size:18px; font-weight:700; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid var(--border); }
.key-numbers-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:10px; }
.kn-card { background:var(--bg-card); padding:14px 18px; border-radius:var(--radius); border:1px solid var(--border); }
.kn-label { font-size:12px; color:var(--text-tertiary); margin-bottom:4px; }
.kn-value { font-size:18px; font-weight:700; color:var(--text-primary); }
.sector-chips { display:flex; flex-wrap:wrap; gap:8px; }
.sector-chip { background:var(--bg-card); border:1px solid var(--border); border-radius:20px; padding:6px 14px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px; }
.chip-impact { font-size:11px; color:var(--text-tertiary); font-weight:400; }
.stocks-table { width:100%; border-collapse:collapse; font-size:14px; }
.stocks-table th { text-align:left; padding:8px 12px; color:var(--text-tertiary); font-size:11px; border-bottom:1px solid var(--border); }
.stocks-table td { padding:10px 12px; border-bottom:1px solid rgba(38,42,53,0.5); }
.ref-list { list-style:none; }
.ref-list li { padding:8px 0; border-bottom:1px solid rgba(38,42,53,0.4); display:flex; justify-content:space-between; align-items:baseline; }
.ref-source { font-size:12px; color:var(--text-tertiary); white-space:nowrap; }
.related-section { margin-top:40px; padding-top:24px; border-top:1px solid var(--border); }
.related-section h2 { font-size:18px; font-weight:700; margin-bottom:14px; }
.related-list { display:flex; flex-direction:column; gap:6px; }
.related-item { padding:10px 14px; background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border); transition:all 0.2s; }
.related-item:hover { border-color:var(--accent); background:var(--bg-hover); }
.related-item .r-date { font-size:12px; color:var(--text-tertiary); }
.related-item .r-title { font-size:14px; font-weight:600; }
.related-item .r-cat { font-size:11px; color:var(--text-tertiary); }
.footer { text-align:center; padding:32px; color:var(--text-tertiary); font-size:13px; border-top:1px solid var(--border); margin-top:40px; }
.footer a { color:var(--text-secondary); }
@media (max-width:640px) {
  .container { padding:20px 16px 60px; }
  .article-title { font-size:22px; }
  .market-bar { gap:12px; }
}
</style>
</head>
<body>
<div class="header">
  <a href="/"><h1>中国股市编年史</h1></a>
  <div class="header-right">${ev.date}</div>
</div>

<div class="container">
  <div class="breadcrumb"><a href="/">首页</a> / <a href="/?category=${esc(ev.category || '')}">${esc(catName)}</a> / ${esc(ev.title_zh)}</div>

  <article class="article-header">
    <div class="article-date">${ev.date}</div>
    <h1 class="article-title">${esc(ev.title_zh || ev.title_en)}</h1>
    <div class="article-meta">
      <span class="badge badge-cat">${esc(catName)}</span>
      ${tags.map(t => `<span class="badge badge-tag">${esc(t)}</span>`).join('')}
      ${cycle ? `<span class="badge badge-cycle" style="background:${cycle.type==='bull'?'rgba(77,175,145,0.12)':'rgba(224,86,96,0.12)'};color:${cycle.type==='bull'?'var(--green)':'var(--red)'};border:1px solid ${cycle.type==='bull'?'rgba(77,175,145,0.25)':'rgba(224,86,96,0.25)'}">${esc(cycle.name_zh)}</span>` : ''}
    </div>
  </article>

  ${shClose != null || changePct != null ? `
  <div class="market-bar">
    ${shClose != null ? `<div class="market-item"><span class="market-label">上证收盘</span><span class="market-value index">${shClose.toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>` : ''}
    ${szClose != null ? `<div class="market-item"><span class="market-label">深证收盘</span><span class="market-value index">${szClose.toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>` : ''}
    ${changePct != null ? `<div class="market-item"><span class="market-label">涨跌幅</span><span class="market-value ${changePct >= 0 ? 'up' : 'down'}">${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%</span></div>` : ''}
  </div>` : ''}

  <div class="article-body">${esc(ev.description_zh || ev.description_en || '')}</div>

  ${renderEnrichedData(ev)}

  ${ev.chain && ev.chain.length ? `
  <section class="enrich-section">
    <h2>相关影响链</h2>
    <div class="related-list">
      ${ev.chain.map(c => `<div class="related-item"><span class="r-date">${esc(c.date || '')}</span> — <span class="r-title">${esc(c.title_zh || c.event_id || '')}</span> <span class="r-cat">${esc(c.relation || '')}</span></div>`).join('')}
    </div>
  </section>` : ''}

  ${related.length ? `
  <section class="related-section">
    <h2>相关事件</h2>
    <div class="related-list">
      ${related.map(r => `<a href="/events/${r.id}.html" class="related-item"><span class="r-date">${r.date}</span> — <span class="r-title">${esc(r.title_zh || r.title_en)}</span> <span class="r-cat">${esc(CATEGORY_NAMES[r.category] || r.category)}</span></a>`).join('')}
    </div>
  </section>` : ''}
</div>

<div class="footer">
  <p><a href="/">中国股市编年史</a> — 记录A股市场的每一次心跳</p>
  <p style="margin-top:4px"><a href="/events/sitemap.xml">事件索引</a></p>
</div>
</body>
</html>`;
}

// Generate pages
console.log(`Generating ${events.length} event pages...`);
let count = 0;
const sitemapEntries = [];

for (const ev of events) {
  const html = buildPage(ev);
  const outPath = path.join(OUT_DIR, `${ev.id}.html`);
  fs.writeFileSync(outPath, html, 'utf-8');
  sitemapEntries.push({ id: ev.id, date: ev.date, title: ev.title_zh || ev.title_en });
  count++;
}
console.log(`  Wrote ${count} pages to ${OUT_DIR}`);

// Generate sitemap.xml
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
${sitemapEntries.map(e => `  <url><loc>${BASE_URL}/events/${e.id}.html</loc><lastmod>${e.date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join('\n')}
</urlset>`;

const sitemapPath = path.join(OUT_DIR, 'sitemap.xml');
fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
console.log(`  Wrote sitemap: ${sitemapPath}`);
console.log('Done.');
