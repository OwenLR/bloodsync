const redis = require('../config/redis');

/**
 * Cache middleware — caches GET responses in Upstash Redis
 * @param {number} ttl - cache duration in seconds
 * @param {function} keyFn - optional function to build cache key from req
 */
const cache = (ttl = 60, keyFn = null) => {
    return async (req, res, next) => {
        const key = keyFn ? keyFn(req) : `cache:${req.originalUrl}`;

        try {
            const cached = await redis.get(key);
            if (cached) {
                return res.status(200).json({
                    status: 'success',
                    cached: true,
                    data: cached,
                });
            }
        } catch (err) {
            // Redis failure should never block the request
            console.error('Cache read error:', err.message);
        }

        // Intercept res.json to store response in cache
        const originalJson = res.json.bind(res);
        res.json = async (body) => {
            if (res.statusCode === 200 && body.status === 'success') {
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
 * Invalidate a cache key or pattern
 * @param {string} key - exact key to delete
 */
const invalidateCache = async (key) => {
    try {
        await redis.del(key);
    } catch (err) {
        console.error('Cache invalidation error:', err.message);
    }
};

module.exports = { cache, invalidateCache };