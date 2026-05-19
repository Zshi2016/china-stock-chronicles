/**
 * Simple in-memory TTL cache middleware for GET endpoints.
 *
 * Cache key = request URL (including query string).
 * TTL defaults to 1 hour (3600 seconds).
 * Skip cache entirely when `?nocache=1` is present.
 */

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

const store = new Map();

/**
 * Periodically purge expired entries (every 5 minutes).
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref(); // don't keep the process alive for this

/**
 * Cache middleware factory.
 *
 * @param {number} [ttlMs] — TTL in milliseconds. Defaults to 1 hour.
 * @returns {import('express').RequestHandler}
 */
function cacheMiddleware(ttlMs) {
  const ttl = ttlMs || DEFAULT_TTL_MS;

  return function cache(req, res, next) {
    // Only cache GET requests.
    if (req.method !== 'GET') return next();

    // Allow clients to bypass the cache.
    if (req.query.nocache === '1') return next();

    const key = req.originalUrl || req.url;

    const cached = store.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      // Return the cached response.
      if (cached.headers) {
        res.set(cached.headers);
      }
      return res.status(cached.status || 200).json(cached.body);
    }

    // Intercept the json() call to capture the response.
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Determine the actual status code.
      const statusCode = res.statusCode || 200;

      // Only cache successful responses.
      if (statusCode >= 200 && statusCode < 300) {
        store.set(key, {
          body,
          status: statusCode,
          headers: { 'x-cache': 'MISS' },
          expiresAt: Date.now() + ttl,
        });
      }

      res.set('x-cache', 'MISS');
      return originalJson(body);
    };

    // Set cache hit header for cached responses (handled above).
    next();
  };
}

/**
 * Invalidate a cache entry by URL key or by a regex pattern.
 *
 * @param {string|RegExp} pattern — exact key or regex to match against keys.
 * @returns {number} number of entries removed.
 */
function invalidate(pattern) {
  let removed = 0;
  if (typeof pattern === 'string') {
    if (store.delete(pattern)) removed++;
    return removed;
  }
  if (pattern instanceof RegExp) {
    for (const key of store.keys()) {
      if (pattern.test(key)) {
        store.delete(key);
        removed++;
      }
    }
  }
  return removed;
}

/**
 * Clear the entire cache.
 */
function clearAll() {
  const count = store.size;
  store.clear();
  return count;
}

module.exports = { cacheMiddleware, invalidate, clearAll };
