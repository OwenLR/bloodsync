/**
 * BusinessError.js — Custom error class for known business rule violations.
 *
 * Services and domain functions throw BusinessError for intentional,
 * expected failures (bad credentials, rule violations, not found, etc.).
 *
 * Controllers catch it and return the appropriate HTTP status code.
 * Plain Error is reserved for unexpected infrastructure failures (DB down,
 * JWT misconfigured, etc.) — those become 500s and are captured by GlitchTip.
 *
 * Usage in services/domain:
 *   throw new BusinessError('Donor has an active deferral');         // 400
 *   throw new BusinessError('Invalid email or password', 401);       // 401
 *   throw new BusinessError('Access denied', 403);                   // 403
 *   throw new BusinessError('Blood drive not found', 404);           // 404
 *
 * Usage in controllers:
 *   } catch (error) {
 *       if (error instanceof BusinessError) {
 *           return res.status(error.statusCode).json({
 *               status: 'error',
 *               message: error.message,
 *           });
 *       }
 *       return response.error(res, error.message); // unexpected 500
 *   }
 */

class BusinessError extends Error {
    /**
     * @param {string} message    - Human-readable error description
     * @param {number} statusCode - HTTP status code (default: 400)
     */
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'BusinessError';
        this.statusCode = statusCode;
    }
}

module.exports = BusinessError;