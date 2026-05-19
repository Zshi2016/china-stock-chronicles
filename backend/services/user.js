/**
 * User service — auth and favorites, using JSON store.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../db/store');

const BCRYPT_ROUNDS = 10;

function getJWTSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-in-production';
}

function getJWTExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '7d';
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, tier: user.subscription_tier },
    getJWTSecret(),
    { expiresIn: getJWTExpiresIn() }
  );
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function register(email, password, displayName) {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }

  if (password.length < 6) {
    const err = new Error('Password must be at least 6 characters');
    err.status = 400;
    throw err;
  }

  const existing = store.findUserByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const password_hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const user = store.createUser({ email, password_hash, display_name: displayName });

  return {
    user: sanitizeUser(user),
    token: signToken(user),
  };
}

function login(email, password) {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }

  const user = store.findUserByEmail(email);
  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  return {
    user: sanitizeUser(user),
    token: signToken(user),
  };
}

function getUserById(id) {
  const user = store.findUserById(id);
  return sanitizeUser(user);
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

function addFavorite(userId, eventId) {
  // Verify the event exists
  const event = store.getEventById(eventId);
  if (!event) {
    const err = new Error('Event not found');
    err.status = 404;
    throw err;
  }

  return store.addFavorite(userId, eventId);
}

function removeFavorite(userId, eventId) {
  return store.removeFavorite(userId, eventId);
}

function listFavorites(userId) {
  return store.listFavoritesByUser(userId);
}

module.exports = {
  register,
  login,
  getUserById,
  addFavorite,
  removeFavorite,
  listFavorites,
  signToken,
};
