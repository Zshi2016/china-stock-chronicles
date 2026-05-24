/**
 * Daily content generator — produces social media posts for 雪球/微博/公众号
 * from "today in history" events.
 *
 * Usage: node generate_daily_content.js [month] [day]
 * Output: data/daily_content.json
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const OUT_FILE = path.join(DATA_DIR, 'daily_content.json');

const events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));

const now = new Date();
const month = parseInt(process.argv[2], 10) || (now.getMonth() + 1);
const day = parseInt(process.argv[3], 10) || now.getDate();

const todayEvents = events.filter(e => {
  const parts = e.date.split('-');
  return parseInt(parts[1]) === month && parseInt(parts[2]) === day;
}).sort((a, b) => b.date.localeCompare(a.date));

if (!todayEvents.length) {
  console.log(`No events found for ${month}/${day}`);
  const output = { date: `${month}-${day}`, events: [], posts: { xueqiu: [], weibo: [], wechat: [] } };
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  process.exit(0);
}

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const TAG_MAP = {
  policy: '#政策市', bubble: '#泡沫', crash: '#崩盘', reform: '#改革',
  international: '#全球市场', scandal: '#股市丑闻', milestone: '#里程碑', other: '#A股'
};

function formatXueqiu(ev) {
  const md = ev.market_data || {};
  const change = md.change_pct ?? ev.change_pct;
  const sh = md.sh_close ?? ev.sh_close;
  const tags = (ev.tags || []).map(t => `#${t}`).join(' ');
  const catTag = TAG_MAP[ev.category] || '#A股';

  let post = `【${ev.title_zh || ev.title_en}】${ev.date}\n\n`;
  post += (ev.description_zh || '').slice(0, 400);
  if ((ev.description_zh || '').length > 400) post += '...';

  if (sh != null || change != null) {
    post += `\n\n📊 市场数据：`;
    if (sh != null) post += `上证 ${sh.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    if (change != null) post += ` ${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
  }

  if (ev.key_numbers && ev.key_numbers.length) {
    post += '\n\n🔢 关键数据：';
    ev.key_numbers.slice(0, 3).forEach(kn => {
      post += `\n· ${kn.label}：${kn.value}`;
    });
  }

  if (ev.affected_sectors && ev.affected_sectors.length) {
    post += `\n\n📈 影响板块：${ev.affected_sectors.map(s => s.name).join('、')}`;
  }

  post += `\n\n${catTag} ${tags} #中国股市编年史 #A股历史`;
  return post;
}

function formatWeibo(ev) {
  const catTag = TAG_MAP[ev.category] || '#A股';
  let post = `#中国股市编年史# ${ev.date.split('-')[0]}年今天\n`;
  post += `${ev.title_zh || ev.title_en}\n`;
  post += (ev.description_zh || '').slice(0, 200);
  if ((ev.description_zh || '').length > 200) post += '...';
  post += `\n${catTag}`;
  return post;
}

function formatWechat(ev) {
  const md = ev.market_data || {};
  const change = md.change_pct ?? ev.change_pct;
  const sh = md.sh_close ?? ev.sh_close;

  let article = `**${ev.date} — ${ev.title_zh || ev.title_en}**\n\n`;
  article += (ev.description_zh || '') + '\n\n';

  if (sh != null || change != null) {
    article += '---\n**市场数据**\n';
    if (sh != null) article += `- 上证综指收盘：${sh.toLocaleString('en-US', {minimumFractionDigits: 2})}\n`;
    if (change != null) article += `- 当日涨跌幅：${change > 0 ? '+' : ''}${change.toFixed(2)}%\n`;
  }

  if (ev.key_numbers && ev.key_numbers.length) {
    article += '\n**关键数据**\n';
    ev.key_numbers.forEach(kn => { article += `- ${kn.label}：${kn.value}\n`; });
  }

  if (ev.affected_sectors && ev.affected_sectors.length) {
    article += `\n**影响板块**：${ev.affected_sectors.map(s => s.name).join('、')}\n`;
  }

  if (ev.references && ev.references.length) {
    article += '\n**参考资料**\n';
    ev.references.forEach(r => { article += `- [${r.title}](${r.url})\n`; });
  }

  article += `\n—— 中国股市编年史 · 每日陪你读懂A股`;
  return article;
}

const posts = {
  date: `${month}-${day}`,
  events: todayEvents.map(e => ({
    id: e.id,
    date: e.date,
    title: e.title_zh || e.title_en,
    year: e.date.split('-')[0],
  })),
  xueqiu: todayEvents.map(e => ({ event_id: e.id, title: e.title_zh, content: formatXueqiu(e) })),
  weibo: todayEvents.map(e => ({ event_id: e.id, title: e.title_zh, content: formatWeibo(e) })),
  wechat: todayEvents.map(e => ({ event_id: e.id, title: e.title_zh, content: formatWechat(e) })),
};

fs.writeFileSync(OUT_FILE, JSON.stringify(posts, null, 2), 'utf-8');
console.log(`Generated content for ${month}/${day}: ${todayEvents.length} events`);
console.log(`  X雪球: ${posts.xueqiu.length} posts`);
console.log(`  微博: ${posts.weibo.length} posts`);
console.log(`  公众号: ${posts.wechat.length} posts`);
console.log(`Written to ${OUT_FILE}`);

// Print preview of first post
if (posts.xueqiu.length) {
  console.log('\n' + '='.repeat(60));
  console.log('PREVIEW (雪球 — first event):');
  console.log('='.repeat(60));
  console.log(posts.xueqiu[0].content);
}
