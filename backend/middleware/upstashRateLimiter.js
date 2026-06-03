const { Ratelimit } = require('@upstash/ratelimit');
const redis = require('../config/redis');

// General API limiter — 100 requests per 15 minutes per IP
const apiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    analytics: true,
    prefix: 'bloodsync:api',
});

// Login limiter — 5 requests per 15 minutes per IP
const loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'bloodsync:login',
});

const createLimiterMiddleware = (limiter) => {
    return async (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const { success, limit, remaining, reset } = await limiter.limit(ip);

        // Always set rate limit headers for transparency
        res.set('X-RateLimit-Limit', limit);
        res.set('X-RateLimit-Remaining', remaining);
        res.set('X-RateLimit-Reset', new Date(reset).toISOString());

        if (!success) {
            return res.status(429).json({
                status: 'error',
                message: 'Too many requests, please try again later',
            });
        }
        next();
    };
};

module.exports = {
    apiRateLimiter: createLimiterMiddleware(apiLimiter),
    loginRateLimiter: createLimiterMiddleware(loginLimiter),
};