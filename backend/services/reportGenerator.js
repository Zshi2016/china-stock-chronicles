const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { marked } = require('marked');

const REPORTS_DIR = path.join(__dirname, '..', '..', 'reports');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function mdToHtml(markdown, stock) {
  const body = marked.parse(markdown);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${stock} — Serenity 瓶颈点分析报告</title>
<style>
  @page { margin: 1.5cm 1.8cm; size: A4; }
  body {
    font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
    font-size: 11pt; line-height: 1.75; color: #1a1a1a; max-width: 100%;
  }
  h1 { font-size: 1.6em; border-bottom: 2px solid #c9a350; padding-bottom: 0.3em; margin-top: 1.2em; }
  h2 { font-size: 1.3em; color: #8b6914; margin-top: 1.1em; border-left: 4px solid #c9a350; padding-left: 0.5em; }
  h3 { font-size: 1.1em; color: #333; margin-top: 0.9em; }
  h4 { font-size: 1em; color: #555; }
  table { width: 100%; border-collapse: collapse; margin: 0.8em 0; font-size: 9.5pt; }
  th { background: #2c3e50; color: #fff; padding: 6px 8px; text-align: left; font-weight: 600; }
  td { border: 1px solid #ddd; padding: 5px 8px; }
  tr:nth-child(even) td { background: #f9f7f2; }
  code { background: #f0ece0; padding: 1px 5px; border-radius: 3px; font-size: 0.9em; }
  strong { color: #5c3d0e; }
  p { margin: 0.4em 0; }
  ul, ol { margin: 0.3em 0; padding-left: 1.5em; }
  li { margin: 0.15em 0; }
  hr { border: none; border-top: 1px solid #ddd; margin: 1.2em 0; }
  blockquote { border-left: 3px solid #c9a350; margin: 0.6em 0; padding: 0.3em 1em; color: #666; background: #fdfaf3; }
  .report-footer { margin-top: 1.5em; padding-top: 0.5em; border-top: 1px solid #ccc; font-size: 9pt; color: #999; text-align: center; }
</style>
</head>
<body>
${body}
<div class="report-footer">Serenity 瓶颈点分析流水线 v2.7.5 · 此报告由 AI 自动生成，不构成投资建议</div>
</body>
</html>`;
}

async function htmlToPdf(htmlPath, pdfPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(EDGE, [
      '--headless',
      '--disable-gpu',
      `--print-to-pdf=${pdfPath}`,
      '--no-pdf-header-footer',
      '--print-background-colors',
      `file:///${htmlPath.replace(/\\/g, '/')}`,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000,
    });

    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(pdfPath)) {
        resolve(pdfPath);
      } else {
        reject(new Error(`PDF 转换失败: Edge exited ${code} — ${stderr.slice(-200)}`));
      }
    });
    child.on('error', (err) => {
      reject(new Error(`无法启动 Edge: ${err.message}`));
    });
  });
}

async function createPdf(markdown, jobId) {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const stock = markdown.split('\n')[0].replace(/^#+\s*/, '').slice(0, 60) || '分析报告';
  const html = mdToHtml(markdown, stock);
  const htmlPath = path.join(REPORTS_DIR, `${jobId}.html`);
  const pdfPath = path.join(REPORTS_DIR, `${jobId}.pdf`);

  fs.writeFileSync(htmlPath, html, 'utf-8');

  await htmlToPdf(htmlPath, pdfPath);

  // Clean up HTML temp file
  try { fs.unlinkSync(htmlPath); } catch (_) { /* ok */ }

  return pdfPath;
}

module.exports = { createPdf };
