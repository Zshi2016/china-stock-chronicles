/**
 * Events routes — /api/events
 */

const { Router } = require('express');
const { query, param, validationResult } = require('express-validator');
const eventsService = require('../services/events');
const { cacheMiddleware } = require('../middleware/cache');

const router = Router();

// Shared cache middleware for historical event data.
const eventCache = cacheMiddleware(60 * 60 * 1000); // 1 hour

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = [
  'milestone', 'bull', 'bear', 'crash',
  'regulation', 'reform', 'scandal', 'ipo',
];

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
// GET /api/events
// ---------------------------------------------------------------------------
router.get('/',
  eventCache,
  [
    query('category').optional().isIn(VALID_CATEGORIES)
      .withMessage(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`),
    query('start_date').optional().isDate()
      .withMessage('start_date must be a valid date (YYYY-MM-DD)'),
    query('end_date').optional().isDate()
      .withMessage('end_date must be a valid date (YYYY-MM-DD)'),
    query('search').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  (req, res, next) => {
    try {
      const result = eventsService.listEvents({
        category:   req.query.category,
        start_date: req.query.start_date,
        end_date:   req.query.end_date,
        search:     req.query.search,
        page:       req.query.page || 1,
        limit:      req.query.limit || 20,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/events/today-in-history
// Must be defined BEFORE /:id to avoid matching "today-in-history" as an id.
// ---------------------------------------------------------------------------
router.get('/today-in-history',
  eventCache,
  [
    query('month').isInt({ min: 1, max: 12 }).withMessage('month must be 1-12'),
    query('day').isInt({ min: 1, max: 31 }).withMessage('day must be 1-31'),
  ],
  validate,
  (req, res, next) => {
    try {
      const month = parseInt(req.query.month, 10);
      const day   = parseInt(req.query.day, 10);
      const data  = eventsService.getTodayInHistory(month, day);
      res.json({ data, date: { month, day } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/events/:id
// ---------------------------------------------------------------------------
router.get('/:id',
  eventCache,
  [
    param('id').isString().notEmpty().withMessage('Event ID is required'),
  ],
  validate,
  (req, res, next) => {
    try {
      const event = eventsService.getEventById(req.params.id);
      if (!event) {
        return res.status(404).json({
          error: true,
          message: 'Event not found',
          status: 404,
        });
      }
      res.json(event);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
