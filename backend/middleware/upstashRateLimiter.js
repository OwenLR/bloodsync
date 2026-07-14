const jwt = require('jsonwebtoken');
const { Ratelimit } = require('@upstash/ratelimit');
const redis = require('../config/redis');

// General API limiter — 300 requests per 1 minute, keyed per authenticated
// user when possible (falls back to IP for unauthenticated requests, e.g.
// hitting a public route before login). Replaces the old flat 100/15min
// IP-only version — see the earlier fix note on why that window/threshold
// combo was too tight for normal browsing.
const apiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(300, '1 m'),
    analytics: true,
    prefix: 'bloodsync:api',
});

// Login limiter — UNCHANGED, stays IP-keyed. A request hitting
// /api/auth/login has no token yet by definition, so there's no user_id
// to key on — IP-based brute-force protection is the correct model here.
const loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'bloodsync:login',
});

/**
 * Resolve a stable identity to rate-limit on, preferring the authenticated
 * user_id over raw IP. Mirrors authMiddleware.js's token lookup exactly
 * (same cookie name, same header, same secret) but never throws and never
 * rejects the request — if verification fails or there's no token, this
 * simply falls back to IP.
 *
 * IMPORTANT: this middleware runs BEFORE verifyToken in server.js's chain
 * (app.use("/api", apiRateLimiter) is mounted ahead of every route's own
 * verifyToken call), so req.user is not populated yet at this point. This
 * is a parallel, read-only decode purely for picking a rate-limit bucket —
 * it is NOT a substitute for verifyToken's actual auth enforcement, and an
 * invalid/expired token here does not block the request; the real route
 * still runs verifyToken afterward and rejects it properly with a 401.
 */
const resolveRateLimitKey = (req) => {
    const token =
        req.cookies?.access_token ||
        req.headers.authorization?.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded?.user_id) {
                return `user:${decoded.user_id}`;
            }
        } catch (_err) {
            // Invalid/expired token — fall through to IP. Not an error
            // case for this middleware; verifyToken handles rejection.
        }
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    return `ip:${ip}`;
};

const createLimiterMiddleware = (limiter, keyFn) => {
    return async (req, res, next) => {
        const key = keyFn(req);
        const { success, limit, remaining, reset } = await limiter.limit(key);

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
    apiRateLimiter: createLimiterMiddleware(apiLimiter, resolveRateLimitKey),
    loginRateLimiter: createLimiterMiddleware(
        loginLimiter,
        (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown'
    ),
};