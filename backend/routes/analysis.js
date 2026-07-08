const { Router } = require('express');
const { check, validationResult } = require('express-validator');
const { createJob, getJob, getQueueStats } = require('../services/jobQueue');
const { getArchiveList, getArchiveMarkdown, findTodayByStock } = require('../services/archiver');

const router = Router();

// POST /api/analysis/submit
router.post(
  '/submit',
  [
    check('stock').trim().notEmpty().withMessage('请输入股票名称或代码'),
    check('email').trim().isEmail().withMessage('请输入有效的邮箱地址'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg });
    }

    const { stock, email } = req.body;

    // Check if same stock was already analyzed today
    const existing = findTodayByStock(stock);
    if (existing) {
      const dateStr = new Date(existing.date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      return res.json({
        success: true,
        jobId: existing.jobId,
        position: null,
        cached: true,
        message: `「${existing.stock}」今日 (${dateStr}) 已有分析报告，直接使用已有结果，无需重新分析。`,
        data: {
          stock: existing.stock,
          chokepoint: existing.chokepoint,
          rawScore: existing.rawScore,
          adjScore: existing.adjScore,
          survivability: existing.survivability,
          positionPct: existing.positionPct,
          r7Quality: existing.r7Quality,
          conclusion: existing.conclusion,
        },
      });
    }

    const result = createJob(stock, email);

    res.json({
      success: true,
      jobId: result.jobId,
      position: result.position,
    });
  }
);

// GET /api/analysis/status/:jobId
router.get('/status/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: true, message: '任务不存在' });
  }
  res.json(job);
});

// GET /api/analysis/queue — queue overview for UI
router.get('/queue', (_req, res) => {
  res.json(getQueueStats());
});

// GET /api/analysis/archive — list past analyses
router.get('/archive', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  res.json(getArchiveList(limit));
});

// GET /api/analysis/markdown/:jobId — full markdown for a past analysis
router.get('/markdown/:jobId', (req, res) => {
  const md = getArchiveMarkdown(req.params.jobId);
  if (!md) return res.status(404).json({ error: true, message: '存档不存在' });
  res.type('text/plain').send(md);
});

module.exports = router;
