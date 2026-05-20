/**
 * Enrich events.json with affected_sectors, notable_stocks, key_numbers, references.
 * Run: node data/enrich_events.js
 */
const fs = require('fs');
const path = require('path');

const eventsPath = path.join(__dirname, 'events.json');
const events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));

// Enrichment data keyed by event ID
const enrichment = {

  // ---- 重大高低点 ----
  'evt-005': {
    affected_sectors: [
      { name: '金融', impact: 'positive' },
      { name: '地产', impact: 'positive' },
      { name: '浦东概念股', impact: 'positive' },
    ],
    notable_stocks: [
      { name: '豫园商城', code: '600655', role: '当时最高价股，达万元/股' },
      { name: '爱使股份', code: '600652', role: '老八股之一，521行情暴涨代表' },
    ],
  },

  'evt-008': {
    affected_sectors: [
      { name: '浦东概念股', impact: 'positive' },
      { name: '金融', impact: 'positive' },
      { name: '商业百货', impact: 'positive' },
    ],
    notable_stocks: [
      { name: '豫园商城', code: '600655', role: '当时A股最高价股，突破万元' },
      { name: '四川长虹', code: '600839', role: '当时第一蓝筹股' },
    ],
    key_numbers: [
      { label: '上证综指点位', value: '1558点' },
      { label: '后续最大跌幅', value: '79%（跌至325点）' },
    ],
  },

  'evt-010': {
    affected_sectors: [
      { name: '全市场', impact: 'negative' },
    ],
    notable_stocks: [
      { name: '马钢股份', code: '600808', role: '325点时最低价股，仅0.20元/股' },
      { name: '四川长虹', code: '600839', role: '第一蓝筹股，随后成为1996年牛市龙头' },
    ],
    key_numbers: [
      { label: '上证综指点位', value: '325.89点' },
      { label: '上证综指市盈率', value: '约12倍' },
      { label: '上证综指市净率', value: '约1.5倍' },
      { label: '从1558点最大跌幅', value: '79.1%' },
    ],
  },

  'evt-014': {
    affected_sectors: [
      { name: '全市场', impact: 'negative' },
    ],
    key_numbers: [
      { label: '两日跌幅', value: '约30%' },
      { label: '蒸发市值（估算）', value: '约2500亿元' },
    ],
    references: [
      { type: 'news', title: '人民日报特约评论员：正确认识当前股票市场', url: 'https://www.people.com.cn/', date: '1996-12-16' },
    ],
  },

  'evt-020': {
    affected_sectors: [
      { name: '科技网络股', impact: 'positive' },
      { name: '计算机应用', impact: 'positive' },
    ],
    notable_stocks: [
      { name: '亿安科技', code: '000008', role: 'A股首只百元股，最高达126.31元，后被证监会查处' },
    ],
    key_numbers: [
      { label: '亿安科技最高价', value: '126.31元' },
    ],
  },

  'evt-021': {
    affected_sectors: [
      { name: '国有上市公司（钢铁、石化、电力）', impact: 'negative' },
    ],
    key_numbers: [
      { label: '国有股减持消息公布后上证跌幅', value: '约40%（2245→1339）' },
    ],
    references: [
      { type: 'policy', title: '减持国有股筹集社会保障资金管理暂行办法', url: 'https://www.gov.cn/', date: '2001-06-12' },
    ],
  },

  'evt-028': {
    key_numbers: [
      { label: '上证综指点位', value: '998.23点' },
      { label: '上证综指市盈率', value: '约15倍' },
      { label: '上证综指市净率', value: '约1.7倍' },
      { label: '从2245点最大跌幅', value: '55.5%' },
    ],
    notable_stocks: [
      { name: '中信证券', code: '600030', role: '2005年上市，随后成为6124大牛市龙头' },
    ],
  },

  'evt-031': {
    affected_sectors: [
      { name: '蓝筹股', impact: 'positive' },
      { name: '题材股/小盘股', impact: 'negative' },
    ],
    notable_stocks: [
      { name: '中国平安', code: '601318', role: '蓝筹代表，530后受益于风格切换' },
    ],
    key_numbers: [
      { label: '跌停个股数', value: '近900只' },
      { label: '蒸发市值', value: '约1.2万亿元' },
      { label: '当日两市成交额', value: '约4160亿元（当时历史第二高）' },
    ],
  },

  'evt-033': {
    key_numbers: [
      { label: '上证综指点位', value: '6124.04点' },
      { label: '上证综指市盈率', value: '约56倍' },
      { label: '上证综指市净率', value: '约7.1倍' },
      { label: '从998点累计涨幅', value: '513%' },
    ],
    notable_stocks: [
      { name: '中国船舶', code: '600150', role: '首只突破300元的股票，牛市标杆' },
      { name: '中国铝业', code: '601600', role: '有色板块龙头，牛市涨幅超10倍' },
    ],
  },

  'evt-036': {
    affected_sectors: [
      { name: '券商', impact: 'positive' },
      { name: '银行', impact: 'positive' },
      { name: '出口行业', impact: 'negative' },
    ],
    notable_stocks: [
      { name: '中信证券', code: '600030', role: '反弹龙头，率先触底反弹' },
      { name: '中国平安', code: '601318', role: '金融股反弹代表' },
    ],
    key_numbers: [
      { label: '上证综指点位', value: '1664.93点' },
      { label: '上证综指市盈率', value: '约13倍' },
      { label: '上证综指市净率', value: '约2.1倍' },
      { label: '从6124点最大跌幅', value: '72.8%' },
      { label: '蒸发市值（峰值至谷底）', value: '约22.6万亿元' },
    ],
  },

  'evt-037': {
    affected_sectors: [
      { name: '基建', impact: 'positive' },
      { name: '钢铁', impact: 'positive' },
      { name: '水泥', impact: 'positive' },
      { name: '有色金属', impact: 'positive' },
      { name: '工程机械', impact: 'positive' },
    ],
    notable_stocks: [
      { name: '海螺水泥', code: '600585', role: '四万亿刺激最受益基建龙头' },
      { name: '三一重工', code: '600031', role: '工程机械龙头，业绩增长数倍' },
      { name: '宝钢股份', code: '600019', role: '钢铁行业龙头' },
    ],
    key_numbers: [
      { label: '刺激计划总规模', value: '4万亿元' },
      { label: '上证反弹幅度（1664→3478）', value: '109%' },
    ],
    references: [
      { type: 'policy', title: '国务院常务会议关于扩大内需促进经济增长的十项措施', url: 'https://www.gov.cn/', date: '2008-11-05' },
    ],
  },

  'evt-041': {
    affected_sectors: [
      { name: '银行', impact: 'negative' },
    ],
    notable_stocks: [
      { name: '工商银行', code: '601398', role: '银行间拆借利率飙升核心标的' },
      { name: '兴业银行', code: '601166', role: '同业业务占比高，受冲击最大' },
    ],
    key_numbers: [
      { label: '蒸发市值', value: '约2.84万亿元' },
      { label: '上证跌幅（14个交易日）', value: '约20%' },
    ],
  },

  'evt-046': {
    affected_sectors: [
      { name: '互联网金融', impact: 'negative' },
      { name: '券商', impact: 'negative' },
    ],
    notable_stocks: [
      { name: '安硕信息', code: '300380', role: '首只400元股，随后暴跌超过90%' },
      { name: '全通教育', code: '300359', role: '在线教育概念龙头，泡沫破灭后暴跌' },
      { name: '东方财富', code: '300059', role: '互联网券商龙头，配资相关标的' },
    ],
    key_numbers: [
      { label: '上证综指点位', value: '5178.19点' },
      { label: '上证综指市盈率', value: '约23倍' },
      { label: '两市两融余额', value: '2.27万亿元（历史最高）' },
      { label: '场外配资规模（估算）', value: '约4-5万亿元' },
    ],
  },

  'evt-048': {
    key_numbers: [
      { label: '当日跌停个股数', value: '约1350只' },
    ],
  },

  'evt-049': {
    key_numbers: [
      { label: '熔断次数', value: '4天2次熔断' },
      { label: '跌停个股数', value: '超过1600只' },
      { label: '蒸发市值（4天）', value: '约6.6万亿元' },
    ],
  },

  'evt-057': {
    affected_sectors: [
      { name: '医药', impact: 'positive' },
      { name: '在线办公/教育', impact: 'positive' },
      { name: '消费', impact: 'negative' },
      { name: '旅游', impact: 'negative' },
      { name: '航空', impact: 'negative' },
    ],
    notable_stocks: [
      { name: '迈瑞医疗', code: '300760', role: '医疗器械龙头' },
      { name: '英科医疗', code: '300677', role: '手套概念涨幅超10倍' },
      { name: '中国中免', code: '601888', role: '免税龙头，疫情承压后强势反弹' },
    ],
    key_numbers: [
      { label: '跌停个股数', value: '超3000只' },
      { label: '蒸发市值（单日）', value: '约4.5万亿元' },
    ],
  },

  'evt-063': {
    affected_sectors: [
      { name: '白酒', impact: 'negative' },
      { name: '医药', impact: 'negative' },
      { name: '新能源', impact: 'negative' },
    ],
    notable_stocks: [
      { name: '贵州茅台', code: '600519', role: '核心资产之王，从2600跌至1300' },
      { name: '宁德时代', code: '300750', role: '新能源标杆，高点回调超40%' },
      { name: '药明康德', code: '603259', role: 'CXO龙头，高点回调超60%' },
    ],
    key_numbers: [
      { label: '上证综指点位', value: '3731.69点' },
      { label: '核心资产整体回调幅度', value: '超30%' },
    ],
  },

  'evt-070': {
    affected_sectors: [
      { name: '券商', impact: 'positive' },
      { name: '金融科技', impact: 'positive' },
      { name: '沪深300成分股', impact: 'positive' },
    ],
    notable_stocks: [
      { name: '东方财富', code: '300059', role: '牛市旗手+互联网券商' },
      { name: '中信证券', code: '600030', role: '券商龙头' },
    ],
    key_numbers: [
      { label: '首日北向资金净流入', value: '约120亿元' },
      { label: '行情启动后6日涨幅', value: '近30%' },
    ],
    references: [
      { type: 'policy', title: '央行、金融监管总局、证监会联合发布会', url: 'https://www.pbc.gov.cn/', date: '2024-09-24' },
    ],
  },

  'evt-071': {
    references: [
      { type: 'policy', title: '中共中央政治局会议公报', url: 'https://www.gov.cn/', date: '2024-09-26' },
    ],
  },

  'evt-082': {
    affected_sectors: [
      { name: '消费', impact: 'positive' },
      { name: '旅游', impact: 'positive' },
      { name: '航空', impact: 'positive' },
      { name: '餐饮', impact: 'positive' },
    ],
    notable_stocks: [
      { name: '中国中免', code: '601888', role: '免税龙头，防疫优化后显著受益' },
      { name: '锦江酒店', code: '600754', role: '酒店龙头，出行复苏直接受益' },
      { name: '上海机场', code: '600009', role: '航空枢纽，国际航线恢复受益' },
    ],
  },

  'evt-083': {
    affected_sectors: [
      { name: '银行', impact: 'positive' },
      { name: 'AI/机器人', impact: 'positive' },
      { name: '新能源', impact: 'positive' },
    ],
    key_numbers: [
      { label: '上证综指点位', value: '约3674点' },
      { label: '日成交额', value: '约1.2-1.5万亿元' },
    ],
  },

  // ---- 更多关键事件 ----
  'evt-039': {
    affected_sectors: [
      { name: '券商', impact: 'positive' },
    ],
    key_numbers: [
      { label: '首批标的', value: '90只' },
    ],
  },

  'evt-040': {
    affected_sectors: [
      { name: '期货概念', impact: 'positive' },
      { name: '券商', impact: 'positive' },
      { name: '权重蓝筹', impact: 'positive' },
    ],
  },

  'evt-064': {
    affected_sectors: [
      { name: '互联网平台', impact: 'positive' },
    ],
    notable_stocks: [
      { name: '腾讯控股', code: '0700.HK', role: '平台经济龙头，会议后大幅反弹' },
      { name: '美团', code: '3690.HK', role: '平台经济代表，政策底确立后反弹' },
    ],
    references: [
      { type: 'policy', title: '国务院金融委会议新闻稿', url: 'https://www.gov.cn/', date: '2022-03-16' },
    ],
  },

  'evt-066': {
    affected_sectors: [
      { name: '房地产', impact: 'positive' },
    ],
    notable_stocks: [
      { name: '万科A', code: '000002', role: '地产龙头，第三支箭直接受益' },
      { name: '保利发展', code: '600048', role: '央企地产龙头' },
    ],
    references: [
      { type: 'policy', title: '证监会恢复房企股权融资', url: 'https://www.csrc.gov.cn/', date: '2022-11-28' },
    ],
  },

  'evt-067': {
    affected_sectors: [
      { name: '券商投行', impact: 'positive' },
      { name: 'ST壳资源', impact: 'negative' },
    ],
  },

  'evt-068': {
    affected_sectors: [
      { name: '券商', impact: 'positive' },
    ],
    notable_stocks: [
      { name: '中信证券', code: '600030', role: '牛市旗手' },
      { name: '东方财富', code: '300059', role: '互联网券商龙头' },
    ],
    references: [
      { type: 'policy', title: '财政部、税务总局关于减半征收证券交易印花税的公告', url: 'https://www.mof.gov.cn/', date: '2023-08-27' },
    ],
  },

  'evt-072': {
    affected_sectors: [
      { name: '券商', impact: 'positive' },
      { name: '金融科技', impact: 'positive' },
    ],
    notable_stocks: [
      { name: '东方财富', code: '300059', role: '成交额创纪录主要受益者' },
    ],
    key_numbers: [
      { label: '两市成交额', value: '3.48万亿元（历史最高）' },
    ],
  },

  'evt-075': {
    key_numbers: [
      { label: '跌停个股数', value: '超2000只' },
      { label: '蒸发市值（单日）', value: '约3万亿元' },
    ],
  },

  'evt-078': {
    notable_stocks: [
      { name: '东方通信', code: '600776', role: '10倍牛股，2440底后暴涨' },
      { name: '中兴通讯', code: '000063', role: '贸易战核心标的' },
    ],
    key_numbers: [
      { label: '上证综指点位', value: '2440.91点' },
    ],
  },

  'evt-079': {
    key_numbers: [
      { label: '上证综指点位', value: '2635.09点' },
      { label: '蒸发市值（峰值起算）', value: '约8万亿元' },
    ],
  },

  'evt-013': {
    affected_sectors: [
      { name: '期货公司', impact: 'negative' },
      { name: '证券公司', impact: 'negative' },
    ],
    key_numbers: [
      { label: '事件结果', value: '万国证券被申银证券合并，总裁管金生入狱17年' },
    ],
  },

  'evt-045': {
    affected_sectors: [
      { name: '房地产', impact: 'positive' },
      { name: '券商', impact: 'positive' },
      { name: '高负债行业', impact: 'positive' },
    ],
  },

  'evt-047': {
    key_numbers: [
      { label: '蒸发市值（单日）', value: '约2万亿元' },
    ],
    affected_sectors: [
      { name: '互联网金融', impact: 'negative' },
      { name: '券商', impact: 'negative' },
    ],
  },

  'evt-065': {
    affected_sectors: [
      { name: '消费', impact: 'negative' },
      { name: '旅游', impact: 'negative' },
      { name: '核酸检测/防疫', impact: 'positive' },
    ],
    key_numbers: [
      { label: '上证综指点位', value: '2863.65点' },
    ],
  },

};

// Apply enrichment
let enriched = 0;
for (const ev of events) {
  const data = enrichment[ev.id];
  if (!data) continue;

  if (data.affected_sectors) ev.affected_sectors = data.affected_sectors;
  if (data.notable_stocks) ev.notable_stocks = data.notable_stocks;
  if (data.key_numbers) ev.key_numbers = data.key_numbers;
  if (data.references) ev.references = data.references;

  enriched++;
}

// Write back
fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2), 'utf-8');
console.log(`Enriched ${enriched} events. Written to ${eventsPath}`);
