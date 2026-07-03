/**
 * cacheService.js — All application caching logic.
 *
 * Exports two types of cache tools:
 *
 * 1. Express middleware (cache) — attach to routes to auto-cache GET responses.
 *    Example: router.get('/availability', cache(60), controller.getAvailability)
 *
 * 2. Manual cache helpers (getCache, setCache, invalidateCache) — call from
 *    services when you need programmatic control (e.g. invalidate after a mutation).
 *
 * Redis failures are always non-fatal — requests proceed normally on any error.
 */

const redis = require('../../config/redis');

/**
 * Express middleware that caches successful GET responses in Upstash Redis.
 *
 * On cache hit  → responds immediately with cached data, skips controller.
 * On cache miss → intercepts res.json, stores the response, then sends it.
 *
 * @param {number}   ttl   - Cache duration in seconds (default: 60)
 * @param {function} keyFn - Optional function(req) => string to build the cache key.
 *                           Defaults to `cache:<req.originalUrl>`
 */
const cache = (ttl = 60, keyFn = null) => {
    return async (req, res, next) => {
        const key = keyFn ? keyFn(req) : `cache:${req.originalUrl}`;

        try {
            const cached = await redis.get(key);
            if (cached) {
                const response = { success: true, cached: true };
                if (Array.isArray(cached)) response.count = cached.length;
                response.data = cached;
                return res.status(200).json(response);
            }
        } catch (err) {
            // Redis failure never blocks the request
            console.error('Cache read error:', err.message);
        }

        // Intercept res.json to store the response before sending
        const originalJson = res.json.bind(res);
        res.json = async (body) => {
            if (res.statusCode === 200 && body.success === true) {
                try {
                    await redis.set(key, body.data, { ex: ttl });
                } catch (err) {
                    console.error('Cache write error:', err.message);
                }
            }
            return originalJson(body);
        };

        next();
    };
};

/**
 * Get a cached value by key.
 *
 * @param {string} key
 * @returns {any|null} Cached value, or null if not found
 */
const getCache = async (key) => {
    try {
        const cached = await redis.get(key);
        return cached ?? null;
    } catch {
        return null;
    }
};

/**
 * Set a cache value with an optional TTL.
 *
 * @param {string} key
 * @param {any}    value
 * @param {number} ttlSeconds - Default: 60
 */
const setCache = async (key, value, ttlSeconds = 60) => {
    try {
        await redis.set(key, value, { ex: ttlSeconds });
    } catch {
        // Non-fatal
    }
};

/**
 * Invalidate (delete) a cache entry.
 * Call this after any mutation that affects cached data.
 *
 * @param {string} key
 */
const invalidateCache = async (key) => {
    try {
        await redis.del(key);
    } catch (err) {
        console.error('Cache invalidation error:', err.message);
    }
};

module.exports = {
    cache,
    getCache,
    setCache,
    invalidateCache,
};