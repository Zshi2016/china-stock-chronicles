/**
 * Index data routes — /api/index and /api/cycles
 */

const { Router } = require('express');
const { query, validationResult } = require('express-validator');
const indexDataService = require('../services/indexData');
const { cacheMiddleware } = require('../middleware/cache');

const router = Router();
const indexCache = cacheMiddleware(60 * 60 * 1000); // 1 hour

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: errors.array().map(e => e.msg).join('; '),
      status: 400,
    });
  }
  next();
}

// ---------------------------------------------------------------------------
// GET /api/index/daily
// ---------------------------------------------------------------------------
router.get('/daily',
  indexCache,
  [
    query('code').isString().notEmpty()
      .withMessage('index code is required (e.g. 000001)'),
    query('start').optional().isDate()
      .withMessage('start must be a valid date (YYYY-MM-DD)'),
    query('end').optional().isDate()
      .withMessage('end must be a valid date (YYYY-MM-DD)'),
    query('limit').optional().isInt({ min: 1, max: 2000 }).toInt(),
  ],
  validate,
  (req, res, next) => {
    try {
      const data = indexDataService.getDaily(req.query.code, {
        start: req.query.start,
        end:   req.query.end,
        limit: req.query.limit,
      });
      res.json({ code: req.query.code, count: data.length, data });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/index/latest
// ---------------------------------------------------------------------------
router.get('/latest',
  cacheMiddleware(5 * 60 * 1000), // shorter TTL: 5 minutes
  (req, res, next) => {
    try {
      const result = indexDataService.getLatest();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/cycles
// ---------------------------------------------------------------------------
router.get('/cycles',
  indexCache,
  (req, res, next) => {
    try {
      const data = indexDataService.getCycles();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
