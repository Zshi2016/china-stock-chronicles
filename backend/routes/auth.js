/**
 * Auth routes — /api/auth and /api/favorites
 */

const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const userService = require('../services/user');
const { requireAuth } = require('../middleware/auth');

const router = Router();

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

// ================================================================
// Auth endpoints
// ================================================================

// POST /api/auth/register
router.post('/auth/register',
  [
    body('email').isEmail().normalizeEmail()
      .withMessage('A valid email is required'),
    body('password').isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('displayName').optional().isString().trim(),
  ],
  validate,
  (req, res, next) => {
    try {
      const result = userService.register(
        req.body.email,
        req.body.password,
        req.body.displayName
      );
      res.status(201).json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({
          error: true,
          message: err.message,
          status: err.status,
        });
      }
      next(err);
    }
  }
);

// POST /api/auth/login
router.post('/auth/login',
  [
    body('email').isEmail().normalizeEmail()
      .withMessage('A valid email is required'),
    body('password').isString().notEmpty()
      .withMessage('Password is required'),
  ],
  validate,
  (req, res, next) => {
    try {
      const result = userService.login(req.body.email, req.body.password);
      res.json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({
          error: true,
          message: err.message,
          status: err.status,
        });
      }
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ================================================================
// Favorites endpoints (all require auth)
// ================================================================

// GET /api/favorites
router.get('/favorites', requireAuth, (req, res, next) => {
  try {
    const data = userService.listFavorites(req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /api/favorites
router.post('/favorites',
  requireAuth,
  [
    body('event_id').isString().notEmpty()
      .withMessage('event_id is required'),
  ],
  validate,
  (req, res, next) => {
    try {
      const favorite = userService.addFavorite(req.user.id, req.body.event_id);
      res.status(201).json(favorite);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({
          error: true,
          message: err.message,
          status: err.status,
        });
      }
      next(err);
    }
  }
);

// DELETE /api/favorites/:event_id
router.delete('/favorites/:event_id',
  requireAuth,
  [
    param('event_id').isString().notEmpty()
      .withMessage('event_id is required'),
  ],
  validate,
  (req, res, next) => {
    try {
      const deleted = userService.removeFavorite(req.user.id, req.params.event_id);
      if (!deleted) {
        return res.status(404).json({
          error: true,
          message: 'Favorite not found',
          status: 404,
        });
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
